/**
 * 纯函数状态机：initialState + createReducer()。
 * 铁律：不可变更新，永远返回新对象/新数组，不产生副作用。
 */
import type {
  Card,
  ChatState,
  ContentBlock,
  CustomInterrupt,
  Message,
} from '../core/types'
import type { ChatAction } from './actions'
import {
  ABORT_RUN,
  ADD_USER_MESSAGE,
  APPEND_AI_CONTENT,
  CLEAR_PENDING_INTERRUPT,
  COMPLETE_AI_MESSAGE,
  COMPLETE_THINKING,
  FINISH_RUN,
  MESSAGES_SNAPSHOT,
  NEW_THREAD,
  SET_CUSTOM_INTERRUPTS,
  SET_ERROR,
  SET_LOGIN_STATUS,
  SET_PENDING_INTERRUPT,
  SET_THREAD_LOAD_ERROR,
  SET_THREADS,
  START_AI_MESSAGE,
  START_RUN,
  START_THINKING,
  SWITCH_THREAD,
  TOGGLE_HISTORY_PANEL,
  TOOL_CALL_ARGS,
  TOOL_CALL_END,
  TOOL_CALL_START,
  TOOL_EXEC_COMPLETE,
  TOOL_EXEC_START,
  TOOL_EXEC_UPDATE,
  UPDATE_THINKING,
  REMOVE_PENDING_MESSAGE,
} from './actions'

export const initialState: ChatState = {
  isLoggedIn: false,
  userInfo: null,
  currentThreadId: '',
  threads: [],
  threadLoading: false,
  threadLoadError: null,
  messages: [],
  activeRunId: null,
  lastRunId: null,
  isStreaming: false,
  lastRunAborted: false,
  error: null,
  historyPanelVisible: false,
  pendingInterrupt: null,
  toolExecutions: {},
}

/** 生成消息 id：msg_{timestamp}_{随机6位36进制}。 */
function genId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/** 把未完成的 thinking 块状态置为 done。 */
function closeThinking(blocks: ContentBlock[]): ContentBlock[] {
  return blocks.map((b) =>
    b.type === 'thinking' && b.status === 'thinking' ? { ...b, status: 'done' } : b,
  )
}

/** 找到最后一条 assistant 消息的索引，找不到返回 -1。 */
function findLastAssistantIndex(messages: Message[]): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant') return i
  }
  return -1
}

/** 把所有消息的 cards 置灰、customInterrupts 置 disabled。 */
function disableAll(messages: Message[]): Message[] {
  return messages.map((m) => ({
    ...m,
    cards: m.cards.map((c) => ({ ...c, cardDisabled: true })),
    customInterrupts: m.customInterrupts
      ? m.customInterrupts.map((ci) => ({ ...ci, disabled: true }))
      : m.customInterrupts,
  }))
}

/** 把所有消息的 customInterrupts 置 disabled（不动 cards）。 */
function disableInterrupts(messages: Message[]): Message[] {
  return messages.map((m) =>
    m.customInterrupts
      ? { ...m, customInterrupts: m.customInterrupts.map((ci) => ({ ...ci, disabled: true })) }
      : m,
  )
}

/**
 * 把后端消息快照转换成统一 Message[]，并还原 pendingInterrupt。
 * 历史消息与实时消息唯一区别：fromHistory:true，卡片/打断默认只读。
 */
function convertSnapshot(state: ChatState, snapshotMessages: any[]): ChatState {
  // 步骤 1：把 reasoning 合并到其后第一条 assistant 的 thinking
  const reasoningMap = new Map<string, string>()
  for (let i = 0; i < snapshotMessages.length; i++) {
    if (snapshotMessages[i]?.role === 'reasoning') {
      for (let j = i + 1; j < snapshotMessages.length; j++) {
        if (snapshotMessages[j]?.role === 'assistant') {
          const aid = snapshotMessages[j].id
          reasoningMap.set(aid, (reasoningMap.get(aid) || '') + (snapshotMessages[i].content || ''))
          break
        }
      }
    }
  }

  let restoredPendingInterrupt: ChatState['pendingInterrupt'] = null

  // 步骤 2：过滤 tool / reasoning，逐条转换
  const convertedMessages: Message[] = snapshotMessages
    .filter((m) => m?.role !== 'tool' && m?.role !== 'reasoning')
    .map((msg) => {
      // 2a. 用户消息
      if (msg.role === 'user') {
        return {
          id: msg.id || genId(),
          role: 'user',
          content: msg.content || '',
          status: 'complete',
          contentBlocks: [],
          cards: [],
          fromHistory: true,
        } as Message
      }

      // 2b. assistant 消息
      const msgId = msg.id || genId()
      const thinking = reasoningMap.get(msg.id) || msg.thinking || ''
      const content = msg.content || ''
      const toolCalls = msg.toolCalls || []

      // 收集打断关联的 toolCallId（这些卡片要隐藏）
      const interruptToolCallIds = new Set<string>()
      if (msg.pendingInterrupts) {
        for (const intr of msg.pendingInterrupts.interrupts || []) {
          if (intr.toolCallId) interruptToolCallIds.add(intr.toolCallId)
        }
      }

      const cards: Card[] = toolCalls.map((tc: any) => {
        let cardData: Record<string, any> = {}
        try {
          cardData = JSON.parse(tc.function?.arguments || '{}')
        } catch {
          cardData = {}
        }
        return {
          toolCallId: tc.id,
          cardType: tc.function?.name || '',
          cardData,
          cardComplete: true,
          cardDisabled: true,
          cardHidden: interruptToolCallIds.has(tc.id),
        }
      })

      // 组装 contentBlocks：thinking → text → 各 card
      const contentBlocks: ContentBlock[] = []
      if (thinking) contentBlocks.push({ type: 'thinking', content: thinking, status: 'done' })
      if (content) contentBlocks.push({ type: 'text', content })
      for (const tc of toolCalls) contentBlocks.push({ type: 'card', toolCallId: tc.id })

      // 2c. 还原打断
      let customInterrupts: CustomInterrupt[] | undefined
      if (msg.pendingInterrupts) {
        const rawInterrupts = msg.pendingInterrupts.interrupts || []
        const threadId = state.currentThreadId
        const runId = msg.pendingInterrupts.runId || ''
        const confirmations = rawInterrupts.filter((i: any) => i.reason === 'confirmation')
        if (confirmations.length > 0) {
          customInterrupts = confirmations.map((i: any) => ({
            id: i.id,
            type: i.metadata?.type || '',
            uiData: i.metadata?.uiData,
            metadata: i.metadata,
            message: i.message,
            toolCallId: i.toolCallId,
            runId,
            threadId,
            disabled: false,
          }))
        }
        const inputRequired = rawInterrupts.filter((i: any) => i.reason === 'input_required')
        if (inputRequired.length > 0) {
          restoredPendingInterrupt = {
            runId,
            threadId,
            messageId: msgId,
            interrupts: inputRequired.map((i: any) => ({
              id: i.id,
              message: i.message,
              uiData: i.metadata?.uiData || {},
            })),
            disabled: false,
          }
        }
      }

      return {
        id: msgId,
        role: 'assistant',
        content,
        thinking,
        status: 'complete',
        cards,
        contentBlocks,
        fromHistory: true,
        ...(customInterrupts ? { customInterrupts } : {}),
      } as Message
    })

  return {
    ...state,
    messages: convertedMessages,
    threadLoading: false,
    threadLoadError: null,
    pendingInterrupt: restoredPendingInterrupt,
  }
}

export function createReducer() {
  return function reducer(state: ChatState, action: ChatAction): ChatState {
    switch (action.type) {
      case SET_LOGIN_STATUS:
        return {
          ...state,
          isLoggedIn: action.payload.isLoggedIn,
          userInfo: action.payload.userInfo || null,
        }

      case SET_THREADS:
        return { ...state, threads: action.payload }

      case NEW_THREAD: {
        const { threadId, skipThreadsList } = action.payload
        const threads = skipThreadsList
          ? state.threads
          : [
              { id: threadId, title: '新会话', createdAt: new Date().toISOString() },
              ...state.threads,
            ]
        return {
          ...state,
          currentThreadId: threadId,
          messages: [],
          error: null,
          threadLoading: false,
          threadLoadError: null,
          lastRunAborted: false,
          threads,
        }
      }

      case SWITCH_THREAD:
        return {
          ...state,
          currentThreadId: action.payload.threadId,
          messages: action.payload.messages || [],
          error: null,
          threadLoading: true,
          threadLoadError: null,
          isStreaming: false,
          lastRunAborted: false,
          activeRunId: null,
          pendingInterrupt: null,
          historyPanelVisible: false,
          toolExecutions: {},
        }

      case SET_THREAD_LOAD_ERROR:
        return {
          ...state,
          threadLoading: false,
          threadLoadError: action.payload.error || '会话加载失败，请重试',
          isStreaming: false,
          activeRunId: null,
        }

      case MESSAGES_SNAPSHOT:
        return convertSnapshot(state, action.payload.messages || [])

      case ADD_USER_MESSAGE: {
        const userMessage: Message = {
          id: action.payload.id,
          role: 'user',
          content: action.payload.content,
          status: 'complete',
          contentBlocks: [],
          cards: [],
        }
        return {
          ...state,
          pendingInterrupt: null,
          lastRunAborted: false,
          messages: [...disableAll(state.messages), userMessage],
        }
      }

      case START_RUN:
        return {
          ...state,
          activeRunId: action.payload.runId,
          lastRunId: action.payload.runId,
          isStreaming: true,
          lastRunAborted: false,
          error: null,
          messages: disableInterrupts(state.messages),
        }

      case START_AI_MESSAGE: {
        const aiMessage: Message = {
          id: action.payload.messageId,
          role: 'assistant',
          content: '',
          contentBlocks: [],
          status: 'streaming',
          cards: [],
        }
        return { ...state, messages: [...state.messages, aiMessage] }
      }

      case APPEND_AI_CONTENT: {
        const delta = action.payload.delta ?? ''
        const updateMsg = (msg: Message): Message => {
          const blocks = [...msg.contentBlocks]
          const last = blocks[blocks.length - 1]
          if (last && last.type === 'text') {
            blocks[blocks.length - 1] = { ...last, content: last.content + delta }
          } else {
            blocks.push({ type: 'text', content: delta })
          }
          return {
            ...msg,
            contentBlocks: blocks,
            content: msg.content + delta,
            status: msg.status === 'error' ? 'error' : 'streaming',
          }
        }
        const messages = [...state.messages]
        if (action.payload.messageId) {
          const idx = messages.findIndex(
            (m) => m.id === action.payload.messageId && m.role === 'assistant',
          )
          if (idx >= 0) messages[idx] = updateMsg(messages[idx])
        } else {
          const idx = findLastAssistantIndex(messages)
          if (idx >= 0) messages[idx] = updateMsg(messages[idx])
        }
        return { ...state, messages }
      }

      case START_THINKING: {
        const messages = [...state.messages]
        const idx = findLastAssistantIndex(messages)
        if (idx >= 0) {
          const msg = messages[idx]
          messages[idx] = {
            ...msg,
            contentBlocks: [
              ...msg.contentBlocks,
              { type: 'thinking', content: '', status: 'thinking' },
            ],
          }
        }
        return { ...state, messages }
      }

      case UPDATE_THINKING: {
        const delta = action.payload.delta ?? ''
        const messages = [...state.messages]
        const idx = findLastAssistantIndex(messages)
        if (idx >= 0) {
          const msg = messages[idx]
          const blocks = [...msg.contentBlocks]
          let found = false
          for (let i = blocks.length - 1; i >= 0; i--) {
            if (blocks[i].type === 'thinking') {
              const t = blocks[i] as Extract<ContentBlock, { type: 'thinking' }>
              blocks[i] = { ...t, content: t.content + delta }
              found = true
              break
            }
          }
          if (!found) blocks.push({ type: 'thinking', content: delta, status: 'thinking' })
          messages[idx] = { ...msg, contentBlocks: blocks }
        }
        return { ...state, messages }
      }

      case COMPLETE_THINKING: {
        const messages = [...state.messages]
        const idx = findLastAssistantIndex(messages)
        if (idx >= 0) {
          const msg = messages[idx]
          const blocks = [...msg.contentBlocks]
          for (let i = blocks.length - 1; i >= 0; i--) {
            if (blocks[i].type === 'thinking') {
              blocks[i] = { ...(blocks[i] as any), status: 'done' }
              break
            }
          }
          messages[idx] = { ...msg, contentBlocks: blocks }
        }
        return { ...state, messages }
      }

      case COMPLETE_AI_MESSAGE: {
        const messages = [...state.messages]
        const idx = findLastAssistantIndex(messages)
        if (idx >= 0) messages[idx] = { ...messages[idx], status: 'complete' }
        return { ...state, messages }
      }

      case SET_ERROR: {
        const errorText =
          action.payload.displayMessage ||
          action.payload.error ||
          'An error occurred. Please try again.'
        // 找最后一条 streaming 的 assistant
        let targetIndex = -1
        for (let i = state.messages.length - 1; i >= 0; i--) {
          if (state.messages[i].role === 'assistant' && state.messages[i].status === 'streaming') {
            targetIndex = i
            break
          }
        }
        let messages: Message[]
        if (targetIndex === -1) {
          // 没有任何 streaming assistant → push 一条 error 消息
          const errorMessage: Message = {
            id: genId(),
            role: 'assistant',
            content: '',
            contentBlocks: [],
            status: 'error',
            cards: [],
            errorMessage: errorText,
          }
          messages = [...state.messages, errorMessage]
        } else {
          messages = state.messages.map((m, i) => {
            if (!(m.role === 'assistant' && m.status === 'streaming')) return m
            const blocks = closeThinking(m.contentBlocks)
            if (i === targetIndex) {
              return { ...m, contentBlocks: blocks, status: 'error', errorMessage: errorText }
            }
            return { ...m, contentBlocks: blocks, status: 'complete' }
          })
        }
        return {
          ...state,
          messages,
          error: action.payload.error || null,
          isStreaming: false,
          activeRunId: null,
          pendingInterrupt: null,
        }
      }

      case FINISH_RUN: {
        const messages = state.messages.map((m) =>
          m.role === 'assistant' && m.status === 'streaming'
            ? { ...m, status: 'complete' as const, contentBlocks: closeThinking(m.contentBlocks) }
            : m,
        )
        return {
          ...state,
          messages,
          activeRunId: null,
          isStreaming: false,
          threadLoading: false,
        }
      }

      case ABORT_RUN: {
        const messages = state.messages.map((m) => {
          const base: Message = {
            ...m,
            cards: m.cards.map((c) => ({ ...c, cardDisabled: true })),
            customInterrupts: m.customInterrupts
              ? m.customInterrupts.map((ci) => ({ ...ci, disabled: true }))
              : m.customInterrupts,
          }
          if (m.role === 'assistant' && m.status === 'streaming') {
            return { ...base, status: 'complete' as const, contentBlocks: closeThinking(m.contentBlocks) }
          }
          return base
        })
        return {
          ...state,
          messages,
          activeRunId: null,
          isStreaming: false,
          lastRunAborted: true,
          pendingInterrupt: null,
          toolExecutions: {},
          threadLoading: false,
          threadLoadError: null,
        }
      }

      case TOGGLE_HISTORY_PANEL:
        return { ...state, historyPanelVisible: !state.historyPanelVisible }

      case TOOL_CALL_START: {
        const { messageId, toolCallId, cardType, displayMessage } = action.payload
        const messages = state.messages.map((m) => {
          if (!(m.id === messageId && m.role === 'assistant')) return m
          const cards = [...m.cards]
          const existIdx = cards.findIndex((c) => c.toolCallId === toolCallId)
          if (existIdx >= 0) {
            cards[existIdx] = { ...cards[existIdx], cardType }
          } else {
            cards.push({
              toolCallId,
              cardType,
              cardData: displayMessage ? { displayMessage } : {},
              cardComplete: false,
              cardDisabled: false,
            })
          }
          const hasBlock = m.contentBlocks.some(
            (b) => b.type === 'card' && b.toolCallId === toolCallId,
          )
          const contentBlocks = hasBlock
            ? m.contentBlocks
            : [...m.contentBlocks, { type: 'card' as const, toolCallId }]
          return { ...m, cards, contentBlocks }
        })
        return { ...state, messages }
      }

      case TOOL_CALL_ARGS: {
        const { messageId, toolCallId, args } = action.payload
        const messages = state.messages.map((m) => {
          if (!(m.id === messageId && m.role === 'assistant')) return m
          const cards = m.cards.map((c) =>
            c.toolCallId === toolCallId ? { ...c, cardData: { ...c.cardData, ...args } } : c,
          )
          return { ...m, cards }
        })
        return { ...state, messages }
      }

      case TOOL_CALL_END: {
        const { messageId, toolCallId, displayMessage } = action.payload
        const messages = state.messages.map((m) => {
          if (!(m.id === messageId && m.role === 'assistant')) return m
          const cards = m.cards.map((c) => {
            if (c.toolCallId !== toolCallId) return c
            return {
              ...c,
              cardComplete: true,
              cardData: displayMessage
                ? { ...c.cardData, endDisplayMessage: displayMessage }
                : c.cardData,
            }
          })
          return { ...m, cards }
        })
        return { ...state, messages }
      }

      case TOOL_EXEC_START: {
        const { toolCallId, toolCallName, statusConfig } = action.payload
        return {
          ...state,
          toolExecutions: {
            ...state.toolExecutions,
            [toolCallId]: { toolCallId, toolCallName, phase: 'pending', statusConfig },
          },
        }
      }

      case TOOL_EXEC_UPDATE:
      case TOOL_EXEC_COMPLETE: {
        const { toolCallId, phase, result, error } = action.payload
        const existing = state.toolExecutions[toolCallId]
        if (!existing) return state
        return {
          ...state,
          toolExecutions: {
            ...state.toolExecutions,
            [toolCallId]: { ...existing, phase, result, error },
          },
        }
      }

      case SET_PENDING_INTERRUPT: {
        const { interruptToolCallIds, ...pending } = action.payload
        let messages = state.messages
        if (interruptToolCallIds && interruptToolCallIds.length > 0) {
          const hiddenSet = new Set(interruptToolCallIds)
          messages = state.messages.map((m) => {
            if (m.id !== pending.messageId) return m
            return {
              ...m,
              cards: m.cards.map((c) =>
                hiddenSet.has(c.toolCallId) ? { ...c, cardHidden: true } : c,
              ),
            }
          })
        }
        return { ...state, pendingInterrupt: pending, messages }
      }

      case CLEAR_PENDING_INTERRUPT:
        return { ...state, pendingInterrupt: null }

      case SET_CUSTOM_INTERRUPTS: {
        const { messageId, interrupts } = action.payload
        const hiddenIds = new Set(
          interrupts.filter((i) => i.toolCallId).map((i) => i.toolCallId as string),
        )
        const messages = state.messages.map((m) => {
          if (m.id !== messageId) return m
          return {
            ...m,
            customInterrupts: interrupts,
            cards: m.cards.map((c) =>
              hiddenIds.has(c.toolCallId) ? { ...c, cardHidden: true } : c,
            ),
          }
        })
        return { ...state, messages }
      }

      case REMOVE_PENDING_MESSAGE: {
        // 移除最后一条处于 streaming 状态的 AI 消息（为重连腾位）
        const msgs = [...state.messages]
        for (let i = msgs.length - 1; i >= 0; i--) {
          if (msgs[i].role === 'assistant' && msgs[i].status === 'streaming') {
            msgs.splice(i, 1)
            break
          }
        }
        return { ...state, messages: msgs }
      }

      default:
        return state
    }
  }
}
