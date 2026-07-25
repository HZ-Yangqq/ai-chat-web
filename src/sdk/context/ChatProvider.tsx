/**
 * 编排大脑：持有 agent 实例与 useReducer(state)，把 agent 事件回调翻译成 dispatch，
 * 并对外提供 sendMessage / continueRun / abortRun / switchThread / createThread / login / logout / openModal 等动作。
 */
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createAgent, eventBus } from '../core'
import { dispatchEvent } from '../core/agent'
import { useModalManager } from './ModalManager'
import type {
  AboveInputEntry,
  AgentCallbacks,
  AgentConfig,
  AgentInstance,
  CardRegistry,
  ChatContextValue,
  ChatMessage,
  ContinueRunOptions,
  InterruptComponentRegistry,
  OpenModalFn,
  QuestionComponentRegistry,
  SendMessageFn,
  ToolRegistry,
} from '../core/types'
import {
  ABORT_RUN,
  ADD_USER_MESSAGE,
  APPEND_AI_CONTENT,
  CLEAR_PENDING_INTERRUPT,
  COMPLETE_AI_MESSAGE,
  COMPLETE_THINKING,
  createReducer,
  FINISH_RUN,
  initialState,
  MESSAGES_SNAPSHOT,
  NEW_THREAD,
  REMOVE_PENDING_MESSAGE,
  SET_CUSTOM_INTERRUPTS,
  SET_ERROR,
  SET_LOGIN_STATUS,
  SET_PENDING_INTERRUPT,
  SET_THREAD_LOAD_ERROR,
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
  UPDATE_THINKING,
} from '../state'
import type { AuthAdapter } from '../core/types'

export const ChatContext = createContext<ChatContextValue | null>(null)

// 稳定空引用，避免默认 {} 每次渲染新建导致重渲染
const EMPTY_CARD_REGISTRY: CardRegistry = {}
const EMPTY_TOOL_REGISTRY: ToolRegistry = {}
const EMPTY_INTERRUPT_COMPONENTS: InterruptComponentRegistry = {}
const EMPTY_QUESTION_COMPONENTS: QuestionComponentRegistry = {}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`
}

/** 解析工具参数：优先 event.args 对象，其次 event.delta 的 JSON 字符串，都不行返回 {}。 */
function parseToolCallArgs(event: any): Record<string, any> {
  if (event?.args && typeof event.args === 'object') return event.args
  if (typeof event?.delta === 'string') {
    try {
      return JSON.parse(event.delta)
    } catch {
      return {}
    }
  }
  return {}
}

export interface ChatProviderProps {
  agent: AgentConfig
  authAdapter?: AuthAdapter
  cards?: CardRegistry
  tools?: ToolRegistry
  interruptComponents?: InterruptComponentRegistry
  questionComponents?: QuestionComponentRegistry
  customEventHandlers?: Record<string, (value: any) => void>
  openModal?: OpenModalFn
  onReady?: () => void
  onError?: (e: Error) => void
  onMessageSend?: (c: string) => void
  onRunStart?: (runId: string) => void
  onRunFinish?: (runId: string) => void
  children?: ReactNode
}

export function ChatProvider(props: ChatProviderProps) {
  const {
    agent: agentConfig,
    authAdapter,
    cards = EMPTY_CARD_REGISTRY,
    tools = EMPTY_TOOL_REGISTRY,
    interruptComponents = EMPTY_INTERRUPT_COMPONENTS,
    questionComponents = EMPTY_QUESTION_COMPONENTS,
    customEventHandlers,
    openModal: openModalFn,
    onReady,
    onError,
    onMessageSend,
    onRunStart,
    onRunFinish,
    children,
  } = props

  const reducer = useMemo(() => createReducer(), [])
  const [state, dispatch] = useReducer(reducer, initialState)

  const agentRef = useRef<AgentInstance | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state
  const agentConfigRef = useRef(agentConfig)
  agentConfigRef.current = agentConfig

  const [aboveInputSlots, setAboveInputSlots] = useState<Map<string, AboveInputEntry>>(
    () => new Map(),
  )
  const [senderHeaderSlots, setSenderHeaderSlots] = useState<Map<string, AboveInputEntry>>(
    () => new Map(),
  )

  /* ---------------- 插槽注册 ---------------- */
  const registerAboveInput = useCallback((entry: AboveInputEntry) => {
    setAboveInputSlots((prev) => {
      const next = new Map(prev)
      next.set(entry.id, entry)
      return next
    })
  }, [])
  const unregisterAboveInput = useCallback((id: string) => {
    setAboveInputSlots((prev) => {
      if (!prev.has(id)) return prev
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }, [])
  const registerSenderHeader = useCallback((entry: AboveInputEntry) => {
    setSenderHeaderSlots((prev) => {
      const next = new Map(prev)
      next.set(entry.id, entry)
      return next
    })
  }, [])
  const unregisterSenderHeader = useCallback((id: string) => {
    setSenderHeaderSlots((prev) => {
      if (!prev.has(id)) return prev
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }, [])

  /* ---------------- 创建 agent 实例（只创建一次） ---------------- */
  useEffect(() => {
    const stableConfig: AgentConfig = {
      get url() {
        return agentConfigRef.current.url
      },
      get requestInterceptor() {
        return agentConfigRef.current.requestInterceptor
      },
      get getForwardedProps() {
        return agentConfigRef.current.getForwardedProps
      },
      get onError() {
        return agentConfigRef.current.onError
      },
      get mock() {
        return agentConfigRef.current.mock
      },
      get timeout() {
        return agentConfigRef.current.timeout
      },
    }
    agentRef.current = createAgent(stableConfig)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------------- 初始化 ---------------- */
  useEffect(() => {
    const init = async () => {
      if (authAdapter) {
        try {
          const loggedIn = await authAdapter.isLoggedIn()
          if (loggedIn) {
            dispatch({
              type: SET_LOGIN_STATUS,
              payload: { isLoggedIn: true, userInfo: authAdapter.getUserInfo() },
            })
          } else {
            dispatch({ type: SET_LOGIN_STATUS, payload: { isLoggedIn: false, userInfo: null } })
          }
        } catch {
          dispatch({ type: SET_LOGIN_STATUS, payload: { isLoggedIn: false, userInfo: null } })
        }
      } else {
        dispatch({
          type: SET_LOGIN_STATUS,
          payload: { isLoggedIn: true, userInfo: { name: '' } },
        })
      }
      if (!stateRef.current.currentThreadId) {
        const threadId = `thread_${generateId()}`
        dispatch({ type: NEW_THREAD, payload: { threadId, skipThreadsList: true } })
      }
      onReady?.()
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sendMessageRef = useRef<SendMessageFn>(async () => {})

  /* ---------------- 已注册工具的前端执行 ---------------- */
  const executeToolCall = useCallback(
    async (
      toolCallName: string,
      toolCallId: string,
      messageId: string,
      args: Record<string, any>,
    ) => {
      const toolDef = tools[toolCallName]
      if (!toolDef) return
      dispatch({
        type: TOOL_EXEC_START,
        payload: { toolCallId, toolCallName, messageId, statusConfig: toolDef.status },
      })
      try {
        const result = await toolDef.execute(args, {
          toolCallId,
          messageId,
          sendMessage: sendMessageRef.current,
          getState: () => stateRef.current,
          reportResult: () => {},
        })
        dispatch({ type: TOOL_EXEC_COMPLETE, payload: { toolCallId, phase: 'success', result } })
        return result
      } catch (err) {
        dispatch({
          type: TOOL_EXEC_COMPLETE,
          payload: { toolCallId, phase: 'error', error: err as Error },
        })
        onError?.(err as Error)
        return undefined
      }
    },
    [tools, onError],
  )

  /* ---------------- login / logout ---------------- */
  const login = useCallback(async () => {
    if (!authAdapter) return
    try {
      const userInfo = await authAdapter.login()
      dispatch({ type: SET_LOGIN_STATUS, payload: { isLoggedIn: true, userInfo } })
    } catch (err) {
      onError?.(err as Error)
    }
  }, [authAdapter, onError])

  const logout = useCallback(async () => {
    try {
      await authAdapter?.logout()
    } finally {
      dispatch({ type: SET_LOGIN_STATUS, payload: { isLoggedIn: false, userInfo: null } })
    }
  }, [authAdapter])

  /* ---------------- createThread ---------------- */
  const createThread = useCallback(async () => {
    const cur = stateRef.current
    if (cur.isStreaming || cur.pendingInterrupt) {
      agentRef.current?.abort()
      dispatch({ type: ABORT_RUN })
      dispatch({ type: CLEAR_PENDING_INTERRUPT })
    }
    const threadId = `thread_${generateId()}`
    dispatch({ type: NEW_THREAD, payload: { threadId } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isStreaming, state.pendingInterrupt])

  const toggleHistoryPanel = useCallback(() => {
    dispatch({ type: TOGGLE_HISTORY_PANEL })
  }, [])

  /* ---------------- abortRun（暂停/取消） ---------------- */
  const abortRun = useCallback(() => {
    const cur = stateRef.current
    if (cur.pendingInterrupt) {
      // 打断态下的"停止" = 向后端发一次 cancelled 续跑
      const { interrupts, runId, threadId } = cur.pendingInterrupt
      if (threadId && agentRef.current) {
        agentRef.current.run(
          {
            threadId,
            runId: `run_${generateId()}`,
            parentRunId: runId,
            resume: interrupts.map((i) => ({ interruptId: i.id, status: 'cancelled' as const })),
            messages: [],
            context: [],
          },
          {},
        )
      }
    } else {
      agentRef.current?.abort()
    }
    dispatch({ type: ABORT_RUN })
    dispatch({ type: CLEAR_PENDING_INTERRUPT })
  }, [])

  /* ---------------- buildRunCallbacks：SSE 事件 → dispatch ---------------- */
  const buildRunCallbacks = useCallback(
    (messageId: string, isContinueRun: boolean): AgentCallbacks => {
      let aiMessageCreated = false
      let serverMessageId: string | null = null

      const resolveMessageId = (event: any) => serverMessageId || event.messageId || messageId
      const ensureAiMessage = (event: any) => {
        if (!aiMessageCreated) {
          aiMessageCreated = true
          const nextId: string = serverMessageId || event.messageId || messageId
          serverMessageId = nextId
          dispatch({ type: START_AI_MESSAGE, payload: { messageId: nextId } })
        }
      }

      return {
        onRunStarted: (event) => {
          if (isContinueRun) {
            dispatch({ type: START_AI_MESSAGE, payload: { messageId } })
            aiMessageCreated = true
            serverMessageId = messageId
          } else {
            onRunStart?.(event.runId || stateRef.current.activeRunId || '')
          }
        },
        onTextMessageStart: (event) => {
          if (isContinueRun) return
          if (!aiMessageCreated) {
            aiMessageCreated = true
            const nextId: string = event.messageId || messageId
            serverMessageId = nextId
            dispatch({ type: START_AI_MESSAGE, payload: { messageId: nextId } })
          }
        },
        onTextMessageContent: (event) => {
          const targetId = isContinueRun ? messageId : undefined
          dispatch({ type: APPEND_AI_CONTENT, payload: { delta: event.delta, messageId: targetId } })
        },
        onTextMessageEnd: () => {
          dispatch({ type: COMPLETE_AI_MESSAGE })
        },
        onThinkingStart: (event) => {
          ensureAiMessage(event)
          dispatch({ type: START_THINKING })
        },
        onThinkingContent: (event) => {
          dispatch({ type: UPDATE_THINKING, payload: { delta: event.delta } })
        },
        onThinkingEnd: () => {
          dispatch({ type: COMPLETE_THINKING })
        },
        onToolCallStart: (event) => {
          ensureAiMessage(event)
          const targetMsgId = isContinueRun ? messageId : resolveMessageId(event)
          dispatch({
            type: TOOL_CALL_START,
            payload: {
              messageId: targetMsgId,
              toolCallId: event.toolCallId,
              cardType: event.toolCallName,
              displayMessage: event.displayMessage,
            },
          })
        },
        onToolCallArgs: (event) => {
          const targetMsgId = isContinueRun ? messageId : resolveMessageId(event)
          dispatch({
            type: TOOL_CALL_ARGS,
            payload: {
              messageId: targetMsgId,
              toolCallId: event.toolCallId,
              args: parseToolCallArgs(event),
            },
          })
        },
        onToolCallEnd: (event) => {
          const targetMsgId = isContinueRun ? messageId : resolveMessageId(event)
          dispatch({
            type: TOOL_CALL_END,
            payload: {
              messageId: targetMsgId,
              toolCallId: event.toolCallId,
              displayMessage: event.displayMessage,
            },
          })
          if (tools[event.toolCallName]) {
            const card = stateRef.current.messages
              .find((m) => m.id === targetMsgId)
              ?.cards.find((c) => c.toolCallId === event.toolCallId)
            if (card) {
              executeToolCall(event.toolCallName, event.toolCallId, targetMsgId, card.cardData)
            }
          }
        },
        onCustom: (event) => {
          eventBus.emit(event.name, event.value)
          customEventHandlers?.[event.name]?.(event.value)
        },
        onRunFinished: (event) => {
          const targetMsgId = isContinueRun ? messageId : serverMessageId || messageId
          if (event.outcome?.type === 'interrupt') {
            const rawInterrupts = event.outcome.interrupts || []
            const threadId = stateRef.current.currentThreadId
            const inputRequired = rawInterrupts.filter((i: any) => i.reason === 'input_required')
            const confirmations = rawInterrupts.filter((i: any) => i.reason === 'confirmation')
            if (confirmations.length > 0 && !aiMessageCreated) {
              aiMessageCreated = true
              const nextId: string = serverMessageId || event.messageId || messageId
              serverMessageId = nextId
              dispatch({ type: START_AI_MESSAGE, payload: { messageId: nextId } })
            }
            if (inputRequired.length > 0) {
              dispatch({
                type: SET_PENDING_INTERRUPT,
                payload: {
                  runId: event.runId,
                  threadId,
                  messageId: targetMsgId,
                  interruptToolCallIds: inputRequired
                    .map((i: any) => i.toolCallId)
                    .filter(Boolean),
                  interrupts: inputRequired.map((i: any) => ({
                    id: i.id,
                    message: i.message,
                    uiData: i.metadata?.uiData || {},
                  })),
                },
              })
            }
            if (confirmations.length > 0) {
              dispatch({
                type: SET_CUSTOM_INTERRUPTS,
                payload: {
                  messageId: targetMsgId,
                  interrupts: confirmations.map((i: any) => ({
                    id: i.id,
                    type: i.metadata?.type,
                    uiData: i.metadata?.uiData,
                    metadata: i.metadata,
                    message: i.message,
                    toolCallId: i.toolCallId,
                    runId: event.runId,
                    threadId,
                    disabled: false,
                  })),
                },
              })
            }
          }
          dispatch({ type: FINISH_RUN })
          onRunFinish?.(event.runId)
        },
        onRunError: (event) => {
          dispatch({
            type: SET_ERROR,
            payload: { error: event.error || event.message, displayMessage: event.displayMessage },
          })
        },
        onMessagesSnapshot: (event) => {
          dispatch({ type: MESSAGES_SNAPSHOT, payload: { messages: event.messages || [] } })
        },
      }
    },
    [tools, customEventHandlers, executeToolCall, onRunStart, onRunFinish],
  )

  /* ---------------- reconnectRun（全量回放+续流） ---------------- */
  const reconnectRunRef = useRef<((threadId: string) => void) | null>(null)

  const reconnectRun = useCallback(
    async (threadId: string) => {
      // 移除 pending 占位消息，为重连流腾位
      dispatch({ type: REMOVE_PENDING_MESSAGE })
      const runId = `run_reconnect_${generateId()}`
      dispatch({ type: START_RUN, payload: { runId } })

      const callbacks = buildRunCallbacks(`msg_${generateId()}`, false)
      const url = `${agentConfigRef.current.url.replace(/\/agent$/, '')}/threads/${threadId}/reconnect`

      try {
        const response = await fetch(url, { method: 'GET' })
        if (!response.ok || !response.body) {
          dispatch({ type: FINISH_RUN })
          return
        }
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue
            const data = trimmed.slice(5).trim()
            if (data === '[DONE]') continue
            try {
              const event = JSON.parse(data)
              // 复用 agent.ts 的事件分发逻辑
              dispatchEvent(event, callbacks)
            } catch { /* skip */ }
          }
        }
      } catch {
        // 网络错误静默处理
      }
      dispatch({ type: FINISH_RUN })
    },
    [buildRunCallbacks],
  )

  reconnectRunRef.current = reconnectRun

  /* ---------------- switchThread ---------------- */
  const switchThread = useCallback(
    async (threadId: string) => {
      agentRef.current?.abort()
      dispatch({ type: CLEAR_PENDING_INTERRUPT })
      dispatch({ type: SWITCH_THREAD, payload: { threadId, messages: [] } })

      const runId = `run_${generateId()}`
      let forwardedProps: Record<string, any> = {}
      try {
        forwardedProps = (await agentConfigRef.current.getForwardedProps?.()) || {}
      } catch {
        forwardedProps = {}
      }
      const input = { threadId, runId, messages: [], context: [], forwardedProps }
      const callbacks = buildRunCallbacks(`msg_${generateId()}`, false)
      const switchCallbacks: AgentCallbacks = {
        ...callbacks,
        onRunError: (e) =>
          dispatch({
            type: SET_THREAD_LOAD_ERROR,
            payload: { error: e.displayMessage || e.error },
          }),
        onMessagesSnapshot: (event) => {
          dispatch({ type: MESSAGES_SNAPSHOT, payload: { messages: event.messages || [] } })
          // 检测最后一条消息是否为 pending（正在生成中），若是则自动重连
          const msgs = event.messages || []
          const lastMsg = msgs[msgs.length - 1]
          if (lastMsg && lastMsg.role === 'assistant' && lastMsg.status === 'pending') {
            // 延迟一帧执行重连，确保 snapshot 状态已更新
            setTimeout(() => reconnectRunRef.current?.(threadId), 0)
          }
        },
      }
      await agentRef.current?.run(input, switchCallbacks)
    },
    [buildRunCallbacks],
  )

  /* ---------------- continueRun（续跑） ---------------- */
  const continueRun = useCallback(
    async (options: ContinueRunOptions) => {
      const cur = stateRef.current
      const { userContent, resume, parentRunId, toolMessages } = options
      if (cur.isStreaming && !resume && !toolMessages) return
      const runId = `run_${generateId()}`
      const threadId = cur.currentThreadId
      if (!threadId) return
      dispatch({ type: CLEAR_PENDING_INTERRUPT })
      dispatch({ type: START_RUN, payload: { runId } })

      const messages: ChatMessage[] = toolMessages
        ? toolMessages
        : userContent
          ? [{ id: `user_${generateId()}`, role: 'user', content: userContent }]
          : []

      let forwardedProps: Record<string, any> = {}
      try {
        forwardedProps = (await agentConfigRef.current.getForwardedProps?.()) || {}
      } catch {
        forwardedProps = {}
      }
      const continueMessageId = `msg_${generateId()}`
      const callbacks = buildRunCallbacks(continueMessageId, true)
      const input = { threadId, runId, parentRunId, resume, messages, context: [], forwardedProps }
      await agentRef.current?.run(input, callbacks)
    },
    [buildRunCallbacks],
  )

  /* ---------------- sendMessage ---------------- */
  const sendMessage = useCallback<SendMessageFn>(
    async (content, options) => {
      const cur = stateRef.current
      if (cur.isStreaming || cur.threadLoading) return
      const runId = `run_${generateId()}`
      const messageId = `msg_${generateId()}`
      const userId = `user_${generateId()}`
      let threadId = cur.currentThreadId
      if (!threadId) {
        threadId = `thread_${generateId()}`
        dispatch({ type: NEW_THREAD, payload: { threadId } })
      }
      dispatch({ type: ADD_USER_MESSAGE, payload: { id: userId, content } })
      dispatch({ type: START_RUN, payload: { runId } })
      onMessageSend?.(content)

      let forwardedProps: Record<string, any> = {}
      try {
        forwardedProps = (await agentConfigRef.current.getForwardedProps?.()) || {}
      } catch {
        forwardedProps = {}
      }
      if (options?.forwardedProps) {
        forwardedProps = { ...forwardedProps, ...options.forwardedProps }
      }

      const input = {
        threadId,
        runId,
        messages: [{ id: userId, role: 'user' as const, content }],
        context: options?.metadata ? [options.metadata] : [],
        forwardedProps,
      }
      const callbacks = buildRunCallbacks(messageId, false)
      await agentRef.current?.run(input, callbacks)
    },
    [buildRunCallbacks, onMessageSend],
  )

  sendMessageRef.current = sendMessage

  /* ---------------- openModal ---------------- */
  // 稳定引用：弹窗内容组件用最新的 sendMessage，但不因其变化重建 manager。
  const stableSendMessage = useCallback<SendMessageFn>(
    (content, options) => sendMessageRef.current(content, options),
    [],
  )
  const { modalElement, openModal: managedOpenModal } = useModalManager(stableSendMessage)

  // 外部传入 openModal 优先（可对接宿主弹窗体系）；否则用 SDK 内置命令式弹窗。
  const openModal = useCallback<OpenModalFn>(
    (component, modalProps, config) => {
      if (openModalFn) return openModalFn(component, modalProps, config)
      return managedOpenModal(component, modalProps, config)
    },
    [openModalFn, managedOpenModal],
  )

  /* ---------------- value ---------------- */
  const value = useMemo<ChatContextValue>(
    () => ({
      state,
      sendMessage,
      continueRun,
      abortRun,
      createThread,
      switchThread,
      toggleHistoryPanel,
      login,
      logout,
      openModal,
      cardRegistry: cards,
      toolRegistry: tools,
      interruptComponents,
      questionComponents,
      aboveInputSlots,
      registerAboveInput,
      unregisterAboveInput,
      senderHeaderSlots,
      registerSenderHeader,
      unregisterSenderHeader,
    }),
    [
      state,
      sendMessage,
      continueRun,
      abortRun,
      createThread,
      switchThread,
      toggleHistoryPanel,
      login,
      logout,
      openModal,
      cards,
      tools,
      interruptComponents,
      questionComponents,
      aboveInputSlots,
      registerAboveInput,
      unregisterAboveInput,
      senderHeaderSlots,
      registerSenderHeader,
      unregisterSenderHeader,
    ],
  )

  return (
    <ChatContext.Provider value={value}>
      {children}
      {modalElement}
    </ChatContext.Provider>
  )
}
