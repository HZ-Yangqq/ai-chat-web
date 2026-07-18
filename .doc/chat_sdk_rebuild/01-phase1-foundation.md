# 01-phase1-foundation

# Phase 1 · 地基层：core / state / context（01）

> 本 Phase 交付 SDK 的「无 UI 内核」：类型、协议、状态机、编排中枢。 完成后即可在测试里用 mock agent 跑通「发消息 → 事件 → dispatch → state 变化」的完整链路。 **按 Task 顺序实现，每个 Task 一个文件。**

---

## Task 1.1 — `core/constants.ts`（先做，无依赖）

**职责**：定义事件类型、消息角色、消息状态三组枚举常量。

**精确内容**（直接照抄结构，值必须一致）：

```ts
export const EVENT_TYPE = {
  TEXT_MESSAGE_START: 'TEXT_MESSAGE_START',
  TEXT_MESSAGE_CONTENT: 'TEXT_MESSAGE_CONTENT',
  TEXT_MESSAGE_END: 'TEXT_MESSAGE_END',
  TEXT_MESSAGE_CHUNK: 'TEXT_MESSAGE_CHUNK',
  TOOL_CALL_START: 'TOOL_CALL_START',
  TOOL_CALL_ARGS: 'TOOL_CALL_ARGS',
  TOOL_CALL_END: 'TOOL_CALL_END',
  TOOL_CALL_CHUNK: 'TOOL_CALL_CHUNK',
  TOOL_CALL_RESULT: 'TOOL_CALL_RESULT',
  REASONING_START: 'REASONING_START',
  REASONING_END: 'REASONING_END',
  REASONING_MESSAGE_START: 'REASONING_MESSAGE_START',
  REASONING_MESSAGE_CONTENT: 'REASONING_MESSAGE_CONTENT',
  REASONING_MESSAGE_END: 'REASONING_MESSAGE_END',
  MESSAGES_SNAPSHOT: 'MESSAGES_SNAPSHOT',
  CUSTOM: 'CUSTOM',
  RUN_STARTED: 'RUN_STARTED',
  RUN_FINISHED: 'RUN_FINISHED',
  RUN_ERROR: 'RUN_ERROR',
  STATE_SNAPSHOT: 'STATE_SNAPSHOT',
  STATE_DELTA: 'STATE_DELTA',
} as const
export type EventType = typeof EVENT_TYPE[keyof typeof EVENT_TYPE]

export const MESSAGE_ROLE = { USER: 'user', ASSISTANT: 'assistant', SYSTEM: 'system', TOOL: 'tool' } as const
export type MessageRole = typeof MESSAGE_ROLE[keyof typeof MESSAGE_ROLE]

export const MESSAGE_STATUS = { COMPLETE: 'complete', STREAMING: 'streaming', ERROR: 'error' } as const
export type MessageStatus = typeof MESSAGE_STATUS[keyof typeof MESSAGE_STATUS]

```

**验收**：三个常量对象 + 三个派生类型可被其它文件 import。

---

## Task 1.2 — `core/types.ts`（全部类型的 SSOT）

**职责**：集中定义 SDK 所有 TypeScript 类型。这些是**接口契约**，请精确落地。

按用途分区，关键类型如下（其余在各 Phase 用到时会重复给出）：

**Agent / 协议**

```ts
export interface AgentConfig {
  url: string
  requestInterceptor?: (request: AgentRequest) => AgentRequest | Promise<AgentRequest>
  getForwardedProps?: () => Record<string, any> | Promise<Record<string, any>>
  onE rror?: (error: AgentError) => void
  mock?: MockAgentFn
  timeout?: number
}
export type MockAgentFn = (input: RunAgentInput, callbacks: AgentCallbacks) => { abort: () => void }

export interface AgentRequest { threadId: string; runId: string; parentRunId?: string; messages: ChatMessage[]; context?: any[]; forwardedProps?: Record<string, any>; resume?: ResumePayload[]; headers?: Record<string, string> }

export interface AgentError { message: string; code?: string; details?: any }

export interface RunAgentInput { threadId: string; runId: string; parentRunId?: string; messages: ChatMessage[]; context?: any[]; forwardedProps?: Record<string, any>; resume?: ResumePayload[] }

export interface AgentInstance { run: (input: RunAgentInput, callbacks: AgentCallbacks) => void; abort: () => void }
// AgentCallbacks：为 §5 每类事件各留一个可选回调，签名统一 (event: any) => void
export interface AgentCallbacks {
  onRunStarted?; onRunFinished?; onRunError?
  onTextMessageStart?; onTextMessageContent?; onTextMessageEnd ?
  onToolCallStart?; onToolCallArgs?; onToolCallEnd?; onToolCallResult?
  onThinkingStart?; onThinkingContent?; onThinkingEnd?
  onMessagesSnapshot?; onCustom?; onStateSnapshot?; onStateDelta?
} // 每项类型为 ((event: any) => void) | undefined

```

**消息**

```ts
export interface ChatMessage { id: string; role: 'user'|'assistant'|'system'|'tool'; content: string; name?: string; toolCallId?: string } // 发给后端的精简结构

export interface Message { id: string; role: 'user'|'assistant'; content: string; status: 'streaming'|'complete'|'error'; contentBlocks: ContentBlock[]; cards: Card[]; errorMessage?: string; customInterrupts?: CustomInterrupt[]; fromHistory?: boolean; thinking?: string }

export type ContentBlock =
  | { type: 'thinking'; content: string; status: 'thinking'|'done' }
  | { type: 'text'; content: string }
  | { type: 'card'; toolCallId: string }
export interface Card { toolCallId: string; cardType: string; cardData: Record<string, any>; cardComplete: boolean; cardDisabled: boolean; cardHidden?: boolean }
export interface Thread { id: string; title?: string; createdAt?: string }

```

**打断**

```ts
export interface GenericQuestionOption { value: string; label: string; description?: string; recommended?: boolean; allowInput?: boolean; customPlaceholder?: string }

export interface GenericQuestion { key: string; title: string; type: 'radio'|'checkbox'|'select'|'input'|'textarea'|string; required?: boolean; placeholder?: string; options?: GenericQuestionOption[] }


export interface GenericInterruptUiData { title?: string; submitText?: string; dismissText?: string; questions?: GenericQuestion[] }

export interface GenericInterrupt { id: string; message?: string; uiData: GenericInterruptUiData }

export interface PendingInterrupt { runId: string; threadId: string; messageId: string; interrupts: GenericInterrupt[]; disabled?: boolean }

export interface CustomInterrupt { id: string; type: string; uiData: any; metadata?: Record<string, any>; message?: string; toolCallId?: string; runId: string; threadId: string; disabled?: boolean }
export interface CustomInterruptProps<T=any> { interrupt: { id; type; uiData: T; metadata?; message?; toolCallId?; runId; threadId }; disabled: boolean; continueRun: (o: ContinueRunOptions)=>void; sendMessage: SendMessageFn }
export type InterruptComponentRegistry = Record<string, ComponentType<CustomInterruptProps>>
export interface QuestionControlProps { question: GenericQuestion; value: any; onChange: (v:any)=>void; disabled?: boolean; interrupt: GenericInterrupt }
export type QuestionComponentRegistry = Record<string, ComponentType<QuestionControlProps>>
export interface ResumePayload { interruptId: string; status: 'resolved'|'cancelled'; payload?: any }

export interface ContinueRunOptions { userContent?: string; resume?: ResumePayload[]; parentRunId?: string; toolMessages?: ChatMessage[] }


```

**卡片 / 工具**

```ts
export interface CardProps<T=Record<string,any>> { cardType: string; toolCallId: string; messageId: string; cardData: T; cardComplete: boolean; disabled: boolean; isStreaming: boolean; sendMessage: (c: string, o?: SendMessageOptions)=>void }
export type CardRegistry = Record<string, ComponentType<CardProps<any>>>
export interface ToolDefinition { execute: (args: Record<string,any>, ctx: ToolContext)=>Promise<any>; status?: ToolStatus; confirm?: boolean|string; showInHistory?: boolean; retry?: { maxAttempts: number; delay?: number } }
export interface ToolStatus { pending: string; success?: string; error?: string; icon?: ReactNode }
export interface ToolContext { toolCallId: string; messageId: string; sendMessage: SendMessageFn; getState: ()=>ChatState; reportResult: (r:any)=>void }
export type ToolRegistry = Record<string, ToolDefinition>
export interface ToolExecutionState { toolCallId: string; toolCallName: string; phase: 'pending'|'executing'|'success'|'error'|'cancelled'; statusConfig?: ToolStatus; result?: any; error?: Error }

```

**认证 / 弹窗 / 动作 / 插槽**

```ts
export interface UserInfo { name: string; avatar?: string; [k: string]: any }
export interface AuthAdapter { isLoggedIn: ()=>boolean|Promise<boolean>; login: ()=>Promise<UserInfo>; logout: ()=>Promise<void>; getUserInfo: ()=>UserInfo|null; LoginComponent?: ComponentType }
export type SendMessageFn = (content: string, options?: SendMessageOptions)=>Promise<void>
export interface SendMessageOptions { type?: string; metadata?: Record<string,any>; forwardedProps?: Record<string,any> }
export type OpenModalFn = <T=any>(component: ComponentType<ModalContentProps>, props?: Record<string,any>, config?: { title?: string; width?: number })=>Promise<T|null>
export interface ModalContentProps { resolve: (v?:any)=>void; reject: ()=>void; sendMessage: SendMessageFn }
export interface ActionContext { close: ()=>void; sendMessage: SendMessageFn; openModal: OpenModalFn; getState: ()=>ChatState }
export interface AboveInputEntry { id: string; node: ReactNode; priority?: number }
export interface QuickAction { key: string; label: string; icon?: ReactNode; description?: string; onClick?: (ctx: ActionContext)=>void }
// Toolbar 相关类型（toolbar/ 可选模块用）：ToolbarActionProps / CheckboxActionProps / MenuActionProps / MenuItem / ModalConfig / OptionItem —— Phase 6 再看

```

**主题 / 布局 / 覆盖**

```ts
export interface ThemeConfig { colorPrimary?; colorBgContainer?; colorBgElevated?; colorText?; colorTextSecondary?; colorBorder?; colorBorderSecondary?; colorSuccess?; colorError?; borderRadiusBubble?; borderRadiusCard?; borderRadiusToolbarBtn?; fontSizeMessage?; fontSizeToolbar?; heightToolbarBtn?; paddingContainer? } // 颜色为 string，其余为 number
export interface LayoutConfig { toolbarPosition?: 'bottom'|'top'|'hidden'; inputPosition?: 'bottom'|'float' }
export interface ComponentOverrides { MessageBubble?; ChatInput?; MarkdownRenderer?; ThinkingBlock?; UnknownCard? } // 各为对应 Props 的 ComponentType
export interface MessageBubbleProps { message: Message; isStreaming?: boolean; isLastMessage?: boolean; renderContentBlock?: (b: ContentBlock, i: number)=>ReactNode; renderInterrupt?: ()=>ReactNode|null; renderTimestamp?: ()=>ReactNode|null }
export interface ChatInputProps { onSend: (c:string)=>void; onCancel: ()=>void; isStreaming: boolean; placeholder?: string; disabled?: boolean; footer?: ReactNode }
export interface MarkdownRendererProps { content: string }
export interface ThinkingBlockProps { thinking: string; isComplete: boolean }
export interface UnknownCardProps { cardType: string; cardData: Record<string,any> }
export interface MessageActionsConfig { enabled?: boolean; copy?: boolean; edit?: boolean; onEditResend?: (content: string, message: Message)=>void }

```

**顶层 Props / 命令句柄 / State / Context**

```ts
export interface ChatSDKProps {
  agent: AgentConfig; authAdapter?: AuthAdapter; components?: ComponentOverrides; messageActions?: MessageActionsConfig
  theme?: ThemeConfig; layout?: LayoutConfig; cards?: CardRegistry; tools?: ToolRegistry
  interruptComponents?: InterruptComponentRegistry; questionComponents?: QuestionComponentRegistry
  customEventHandlers?: Record<string, (value:any)=>void>; children?: ReactNode; placeholder?: string

  welcome?: ReactNode; quickActions?: QuickAction[]; senderFooter?: ReactNode

  onReady?: ()=>void; onError?: (e: Error)=>void; onMessageSend?: (c: string)=>void
  onRunStart?: (runId: string)=>void; onRunFinish?: (runId: string)=>void
}
export interface ChatSDKHandle { switchThread: (id: string)=>Promise<void>; createThread: ()=>Promise<void>; getThreadId: ()=>string }
export interface ChatState { /* 见 00-overview §6.3，逐字段落地 */ }
export interface ChatContextValue {
  state: ChatState; sendMessage: SendMessageFn; continueRun: (o: ContinueRunOptions)=>void; abortRun: ()=>void
  createThread: ()=>Promise<void>; switchThread: (id: string)=>Promise<void>; toggleHistoryPanel: ()=>void
  login: ()=>Promise<void>; logout: ()=>Promise<void>; openModal: OpenModalFn
  cardRegistry: CardRegistry; toolRegistry: ToolRegistry; interruptComponents: InterruptComponentRegistry; questionComponents: QuestionComponentRegistry
  aboveInputSlots: Map<string, AboveInputEntry>; registerAboveInput: (e: AboveInputEntry)=>void; unregisterAboveInput: (id: string)=>void
  senderHeaderSlots: Map<string, AboveInputEntry>; registerSenderHeader: (e: AboveInputEntry)=>void; unregisterSenderHeader: (id: string)=>void
}

```

**验收**：`tsc` 无类型错误；所有 Phase 后续引用的类型均已定义。

---

## Task 1.3 — `core/eventBus.ts`（极简发布订阅）

**职责**：用于 `CUSTOM` 事件的跨组件广播。

**伪代码**：

```plaintext
class EventBus:
  listeners: Map<string, Set<Handler>>
  on(event, handler):  确保有 Set → 加入 → 返回取消函数 (()=>off(event,handler))
  off(event, handler): listeners.get(event)?.delete(handler)
  emit(event, payload): 遍历该 event 的 handlers，逐个 try/catch 调用（出错 console.error 不中断其它）
  clear(): listeners.clear()
导出单例：export const eventBus = new EventBus()

```

**验收**：`on` 返回的函数能取消订阅；`emit` 中某个 handler 抛错不影响其它 handler。

---

## Task 1.4 — `core/agent.ts`（SSE 请求 + 事件分发）

**职责**：`createAgent(config)` 返回 `{ run, abort }`。`run` 发起 SSE 请求，逐行解析并按 type 分发到 callbacks。

**内部函数 1 —** `**parseSseLine(line)**`：

```plaintext
去空白；若不以 'data:' 开头 → 返回 null
data = 去掉 'data:' 前缀并 trim
若 data === '[DONE]' → 返回 null
try JSON.parse(data) 返回对象；catch → 返回 null

```

**内部函数 2 —** `**dispatchEvent(event, callbacks)**`：按 `event.type` switch，映射到 callback（映射见 00-overview §5 与下表）：

```plaintext
RUN_STARTED→onRunStarted   RUN_FINISHED→onRunFinished   RUN_ERROR→onRunError
TEXT_MESSAGE_START→onTextMessageStart
TEXT_MESSAGE_CONTENT | TEXT_MESSAGE_CHUNK → onTextMessageContent
TEXT_MESSAGE_END→onTextMessageEnd
TOOL_CALL_START→onToolCallStart
TOOL_CALL_ARGS | TOOL_CALL_CHUNK → onToolCallArgs
TOOL_CALL_END→onToolCallEnd   TOOL_CALL_RESULT→onToolCallResult
REASONING_START | REASONING_MESSAGE_START → onThinkingStart
REASONING_MESSAGE_CONTENT → onThinkingContent
REASONING_MESSAGE_END | REASONING_END → onThinkingEnd
MESSAGES_SNAPSHOT→onMessagesSnapshot   CUSTOM→onCustom
STATE_SNAPSHOT→onStateSnapshot   STATE_DELTA→onStateDelta
（每个 callback 用可选链调用：callbacks.onXxx?.(event)）

```

**内部函数 3 —** `**createSseAgent(config)**`：

```plaintext
持有 abortController: AbortController | null
run(input, callbacks) async:
  abortController = new AbortController()
  forwardedProps = {}；若 config.getForwardedProps 存在 → try await 取值（失败忽略）

  body = { threadId, runId, messages, context: input.context||[], forwardedProps: {...forwardedProps, ...input.forwardedProps} }

  若 input.parentRunId → body.parentRunId = it
  若 input.resume?.length → body.resume = it
  request = { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body), signal: abortController.signal }
  若 config.requestInterceptor → try 调用，合并返回的 headers 到 request.headers（失败忽略）
  try:
    response = await fetch(config.url, request)
    若 !response.ok → callbacks.onRunError?.({type:RUN_ERROR, message:`HTTP ${status}: ${statusText}`}) → return
    reader = response.body?.getReader()；若无 → onRunError('Response body is not readable') → return
    decoder = new TextDecoder(); buffer = ''
    while true:
      { done, value } = await reader.read(); 若 done break
      buffer += decoder.decode(value, {stream:true})
      lines = buffer.split('\n'); buffer = lines.pop() || ''   // 最后一段可能不完整，留到下轮
      for line of lines: event=parseSseLine(line); 若 event → dispatchEvent(event, callbacks)
    // 收尾：处理残留 buffer
    若 buffer.trim(): event=parseSseLine(buffer); 若 event → dispatchEvent
  catch err:
    若 err.name === 'AbortError' → return（用户主动中断，不报错）
    否则 onRunError?.({type:RUN_ERROR, message: err.message || 'Unknown error'})
abort(): abortController?.abort(); abortController = null
return { run, abort }

```

**导出** `**createAgent(config)**`：

```plaintext
若 config.mock 存在 → 返回 { run: (input,cb)=> config.mock(input,cb), abort: ()=>{} }  // mock 模式，测试用
否则 → return createSseAgent(config)

```

**验收**：mock 模式下 `run` 直接调用 mock；SSE 模式下能把 `data: {...}` 行正确解析并分发；`abort()` 后 fetch 的 AbortError 被吞掉不报错。

---

## Task 1.5 — `core/index.ts`

```ts
export * from './types'
export * from './constants'
export { EventBus, eventBus } from './eventBus'
export { createAgent } from './agent'

```
---

## Task 1.6 — `state/actions.ts`（action 常量 + 联合类型）

**职责**：定义所有 action type 字符串常量（每个用 `as const`）与 `ChatAction` 判别联合类型。

常量清单（值 = 变量名字符串）：

```plaintext
SET_LOGIN_STATUS
SET_THREADS, NEW_THREAD, SWITCH_THREAD, SET_THREAD_LOAD_ERROR
ADD_USER_MESSAGE, MESSAGES_SNAPSHOT, START_RUN, START_AI_MESSAGE, APPEND_AI_CONTENT
START_THINKING, UPDATE_THINKING, COMPLETE_THINKING, COMPLETE_AI_MESSAGE
SET_ERROR, FINISH_RUN, ABORT_RUN
TOOL_CALL_START, TOOL_CALL_ARGS, TOOL_CALL_END
TOOL_EXEC_START, TOOL_EXEC_UPDATE, TOOL_EXEC_COMPLETE
TOGGLE_HISTORY_PANEL
SET_PENDING_INTERRUPT, CLEAR_PENDING_INTERRUPT, SET_CUSTOM_INTERRUPTS

```

`ChatAction` 联合（每个成员 `{ type: typeof X; payload: ... }`，payload 要点）：

```plaintext
SET_LOGIN_STATUS   { isLoggedIn: boolean; userInfo?: UserInfo|null }

SET_THREADS        Thread[]

NEW_THREAD         { threadId: string; skipThreadsList?: boolean }

SWITCH_THREAD      { threadId: string; messages?: Message[] }

SET_THREAD_LOAD_ERROR { error?: string }
ADD_USER_MESSAGE   { id: string; content: string }

MESSAGES_SNAPSHOT  { messages: any[] }

START_RUN          { runId: string }
START_AI_MESSAGE   { messageId: string }
APPEND_AI_CONTENT  { delta: string; messageId?: string }
START_THINKING     (无 payload)
UPDATE_THINKING    { delta: string }
COMPLETE_THINKING  (无)   COMPLETE_AI_MESSAGE (无)
SET_ERROR          { error?: string; displayMessage?: string }
FINISH_RUN (无)    ABORT_RUN (无)   TOGGLE_HISTORY_PANEL (无)
TOOL_CALL_START    { messageId; toolCallId; cardType; displayMessage? }
TOOL_CALL_ARGS     { messageId; toolCallId; args: Record<string,any> }
TOOL_CALL_END      { messageId; toolCallId; displayMessage? }
TOOL_EXEC_START    { toolCallId; toolCallName; messageId; statusConfig? }
TOOL_EXEC_UPDATE   { toolCallId; phase; result?; error? }
TOOL_EXEC_COMPLETE { toolCallId; phase:'success'|'error'; result?; error? }

SET_PENDING_INTERRUPT   PendingInterrupt & { interruptToolCallIds?: string[] }

CLEAR_PENDING_INTERRUPT (无)

SET_CUSTOM_INTERRUPTS   { messageId: string; interrupts: CustomInterrupt[] }


```

**验收**：`ChatAction` 能被 reducer 的 switch 穷尽判别。

---

## Task 1.7 — `state/reducer.ts`（纯函数状态机，核心）

**职责**：导出 `initialState` 与 `createReducer()`（返回 `(state, action) => ChatState`）。 **铁律**：纯函数，不可变更新（永远返回新对象/新数组），不产生副作用。

`**initialState**`：所有字段初值 —— 布尔 false，字符串 ''，数组 \[\]，对象 {}，可空字段 null；`messages:[]`, `toolExecutions:{}`, `threadLoading:false` 等（见 00-overview §6.3）。

**辅助函数** `genId()`：返回 `msg_{Date.now()}_{随机6位36进制}`。

**各分支逻辑（逐条实现）**：

*   **SET\_LOGIN\_STATUS**：`isLoggedIn` = payload.isLoggedIn；`userInfo` = payload.userInfo || null。
    
*   **SET\_THREADS**：`threads` = payload。
    
*   **NEW\_THREAD**：`currentThreadId`\=threadId，`messages`\=\[\]，`error`\=null，`threadLoading`\=false，`threadLoadError`\=null，`lastRunAborted`\=false。若 **!skipThreadsList** → 在 `threads` 头部插入 `{ id: threadId, title:'新会话', createdAt: 当前ISO }`。
    
*   **SWITCH\_THREAD**：换 `currentThreadId`，`messages`\=payload.messages||\[\]，`error`\=null，`**threadLoading**`**\=true**，`threadLoadError`\=null，`isStreaming`\=false，`lastRunAborted`\=false，`activeRunId`\=null，`pendingInterrupt`\=null，`historyPanelVisible`\=false，`toolExecutions`\={}。
    
*   **SET\_THREAD\_LOAD\_ERROR**：`threadLoading`\=false，`threadLoadError`\=payload.error||'会话加载失败，请重试'，`isStreaming`\=false，`activeRunId`\=null。
    
*   **MESSAGES\_SNAPSHOT**：**见 Phase 5 详解**（历史快照转换，逻辑较重）。Phase 1 先留一个能编译的最简版本：把 `payload.messages` 原样映射为 `messages`，`threadLoading`\=false。Phase 5 再替换为完整实现。
    
*   **ADD\_USER\_MESSAGE**：`pendingInterrupt`\=null，`lastRunAborted`\=false；`messages` = 旧消息（**每条的 cards 全部置** `**cardDisabled:true**`，有 customInterrupts 的**每个置** `**disabled:true**`）+ 追加一条用户消息 `{ id, role:'user', content, status:'complete', contentBlocks:[], cards:[] }`。
    
*   **START\_RUN**：`activeRunId`\=`lastRunId`\=runId，`isStreaming`\=true，`lastRunAborted`\=false，`error`\=null；并把所有带 customInterrupts 的消息里每个 interrupt 置 disabled。
    
*   **START\_AI\_MESSAGE**：`messages` 追加 `{ id: messageId, role:'assistant', content:'', contentBlocks:[], status:'streaming', cards:[] }`。
    
*   **APPEND\_AI\_CONTENT**：`delta` = payload.delta ?? ''。定义 `updateMsg(msg)`：取 contentBlocks 副本，若**最后一块是 text** → 拼接其 content，否则 **push 新 text 块**；`content` += delta；status 若为 error 保持，否则设 streaming。若 payload.messageId 存在 → 更新 id 匹配且 role=assistant 的那条；否则 → 更新最后一条 assistant。
    
*   **START\_THINKING**：取最后一条 assistant，向其 contentBlocks **push** `**{ type:'thinking', content:'', status:'thinking' }**`。
    
*   **UPDATE\_THINKING**：取最后一条 assistant，**从后往前找最近一个 thinking 块**，累加 delta；找不到则 push 一个新的 thinking 块（content=delta,status='thinking'）。
    
*   **COMPLETE\_THINKING**：取最后一条 assistant，从后往前找最近 thinking 块，`status`\='done'。
    
*   **COMPLETE\_AI\_MESSAGE**：最后一条 assistant 的 status = 'complete'。
    
*   **SET\_ERROR**：errorText = displayMessage || error || 'An error occurred. Please try again.'。找到**最后一条 streaming 的 assistant**（targetIndex）。遍历 messages：非 streaming-assistant 原样；是 streaming-assistant 则先 closeThinking（把未完 thinking 置 done），若是 targetIndex → 设 `errorMessage`+`status:'error'`，否则 → `status:'complete'`。若没有任何 streaming assistant（targetIndex=-1）→ push 一条 error 消息。最终 `error`\=payload.error||null，`isStreaming`\=false，`activeRunId`\=null，`pendingInterrupt`\=null。
    
*   **FINISH\_RUN**：把所有 streaming assistant 置 complete 并 closeThinking；`activeRunId`\=null，`isStreaming`\=false，`threadLoading`\=false（兜底）。
    
*   **ABORT\_RUN**：所有消息 cards 置 `cardDisabled:true`、customInterrupts 置 disabled；streaming assistant 额外置 complete + closeThinking。`activeRunId`\=null，`isStreaming`\=false，`**lastRunAborted**`**\=true**，`pendingInterrupt`\=null，`toolExecutions`\={}，`threadLoading`\=false，`threadLoadError`\=null。
    
*   **TOGGLE\_HISTORY\_PANEL**：翻转 `historyPanelVisible`。
    
*   **TOOL\_CALL\_START**：找到 `messageId` 且 role=assistant 的消息，在其 `cards` 中按 toolCallId 查：存在→更新 cardType；不存在→push `{ toolCallId, cardType, cardData: displayMessage?{displayMessage}:{}, cardComplete:false, cardDisabled:false }`。并确保 contentBlocks 里有对应 `{ type:'card', toolCallId }`（不存在才 push）。
    
*   **TOOL\_CALL\_ARGS**：找到消息，对应 card 的 `cardData` 合并 `args`（浅合并 `{...cardData, ...args}`）。
    
*   **TOOL\_CALL\_END**：对应 card 置 `cardComplete:true`，若有 displayMessage → 合并 `{ endDisplayMessage: displayMessage }` 进 cardData。
    
*   **TOOL\_EXEC\_START**：`toolExecutions[toolCallId]` = `{ toolCallId, toolCallName, phase:'pending', statusConfig }`。
    
*   **TOOL\_EXEC\_UPDATE / TOOL\_EXEC\_COMPLETE**：合并更新该项的 `phase`，按需带上 `result` / `error`。
    
*   **SET\_PENDING\_INTERRUPT**：从 payload 取出 `interruptToolCallIds`，其余作为 pending。`pendingInterrupt`\=pending；若有隐藏 id → 把 `pending.messageId` 消息中这些 toolCallId 的 card 置 `cardHidden:true`。
    
*   **CLEAR\_PENDING\_INTERRUPT**：`pendingInterrupt`\=null。
    
*   **SET\_CUSTOM\_INTERRUPTS**：hiddenIds = interrupts 里有 toolCallId 的集合；把 `messageId` 消息的 `customInterrupts`\=interrupts，并把命中 hiddenIds 的 card 置 cardHidden。
    
*   **default**：返回 state。
    

> 复用小工具：`closeThinking(blocks)` = 把 `status==='thinking'` 的 thinking 块改成 `'done'`。

**验收**：对每个 action 写一个最小单测（旧 state + action → 新 state 字段符合上述），全绿。

---

## Task 1.8 — `state/index.ts`

```ts
export { createReducer, initialState } from './reducer'
export * from './actions'

```
---

（context 层见本文件下半部分）

---

## Task 1.9 — `context/ChatProvider.tsx`（编排大脑，核心中的核心）

**职责**：持有 agent 实例与 `useReducer(state)`，把 agent 的事件回调翻译成 dispatch，并对外提供 `sendMessage / continueRun / abortRun / switchThread / createThread / login / logout / openModal` 等动作，通过 `ChatContext.Provider` 下发。

**顶部定义**：

```plaintext
export const ChatContext = createContext<ChatContextValue | null>(null)
// 稳定空引用（避免默认 {} 每次渲染新建导致重渲染）
const EMPTY_CARD_REGISTRY / EMPTY_TOOL_REGISTRY / EMPTY_INTERRUPT_COMPONENTS / EMPTY_QUESTION_COMPONENTS = {}
function generateId(): 优先 crypto.randomUUID()，否则 `${Date.now()}_{随机}`
function parseToolCallArgs(event): 若 event.args 是对象→返回它；否则若 event.delta 是字符串→try JSON.parse；都不行→返回 {}

```

**Props**：`agent, authAdapter, cards, tools, interruptComponents, questionComponents, customEventHandlers, openModal, onReady, onError, onMessageSend, onRunStart, onRunFinish, children`（注册表用上面的 EMPTY\_\* 作默认值）。

**Hook 内部结构**：

```plaintext

reducer = useMemo(()=>createReducer(), [])

[state, dispatch] = useReducer(reducer, initialState)
agentRef = useRef<AgentInstance|null>(null)
stateRef = useRef(state); stateRef.current = state          // 供回调惰性读最新 state
agentConfigRef = useRef(agentConfig); agentConfigRef.current = agentConfig
[aboveInputSlots, setAboveInputSlots] = useState(()=>new Map())
[senderHeaderSlots, setSenderHeaderSlots] = useState(()=>new Map())

```

**插槽注册**（4 个 useCallback）：`registerAboveInput/unregisterAboveInput/registerSenderHeader/unregisterSenderHeader` —— 基于不可变地更新对应的 Map（复制→set/delete→返回新 Map；delete 前先判断 has 避免无意义更新）。

**创建 agent 实例（只创建一次）**：

```plaintext
useEffect(()=>{
  // 用 getter 包一层，让稳定实例每次 run 时惰性读取 agentConfigRef.current 的最新字段
  stableConfig = { get url(){return agentConfigRef.current.url}, get requestInterceptor(){...}, get getForwardedProps(){...}, get onError(){...}, get mock(){...}, get timeout(){...} }
  agentRef.current = createAgent(stableConfig)

}, [])   // 空依赖！


```
> **关键坑（务必照做）**：agent 实例只能创建一次。若把 `agentConfig` 作依赖，调用方传内联对象会导致实例反复重建，正在进行的 SSE 请求持有的 abortController 丢失，「停止」按钮就失效。用 getter + 空依赖解决。

**初始化 useEffect（空依赖）**：

```plaintext
async init():
  若 authAdapter: try 取 isLoggedIn → 登录则 dispatch(SET_LOGIN_STATUS, {true, getUserInfo()}) 否则 {false,null}；catch 也 dispatch {false,null}
  否则（无 authAdapter）: dispatch(SET_LOGIN_STATUS, {isLoggedIn:true, userInfo:{name:''}})   // 默认放行
  若 !stateRef.current.currentThreadId: threadId=`thread_${generateId()}`; dispatch(NEW_THREAD, {threadId, skipThreadsList:true})
  onReady?.()

```

**executeToolCall（useCallback，依赖 \[toolRegistry, onError\]）** —— 已注册工具的前端执行：

```plaintext
toolDef = toolRegistry[toolCallName]; 若无 → return
dispatch(TOOL_EXEC_START, {toolCallId, toolCallName, messageId, statusConfig: toolDef.status})
try:
  result = await toolDef.execute(args, { toolCallId, messageId, sendMessage: sendMessageRef.current, getState: ()=>stateRef.current, reportResult: ()=>{} })
  dispatch(TOOL_EXEC_COMPLETE, {toolCallId, phase:'success', result}); return result
catch err:
  dispatch(TOOL_EXEC_COMPLETE, {toolCallId, phase:'error', error: err}); onError?.(err); return undefined

```

**login / logout（useCallback）**：调用 authAdapter 对应方法，成功后 dispatch(SET\_LOGIN\_STATUS)；logout 无论成败最终置未登录。

**createThread（useCallback，依赖 \[isStreaming, pendingInterrupt\]）**：

```plaintext
若正在 streaming 或有 pendingInterrupt → agentRef.abort(); dispatch(ABORT_RUN); dispatch(CLEAR_PENDING_INTERRUPT)
threadId=`thread_${generateId()}`; dispatch(NEW_THREAD, {threadId})

```

**toggleHistoryPanel**：dispatch(TOGGLE\_HISTORY\_PANEL)。

**abortRun（useCallback）** —— 暂停/取消：

```plaintext
cur = stateRef.current
若 cur.pendingInterrupt 存在:  // 打断态下的"停止" = 向后端发一次 cancelled 续跑
  { interrupts, runId, threadId } = pendingInterrupt
  若 threadId 且 agentRef.current:

    agentRef.run({ threadId, runId:`run_${generateId()}`, parentRunId: runId, resume: interrupts.map(i=>({interruptId:i.id, status:'cancelled'})), messages:[], context:[] }, {})

否则: agentRef.current?.abort()   // 普通流式 → 直接中断 fetch
dispatch(ABORT_RUN); dispatch(CLEAR_PENDING_INTERRUPT)

```

**buildRunCallbacks(messageId, isContinueRun)（useCallback，依赖 \[toolRegistry, customEventHandlers, executeToolCall, onRunStart, onRunFinish\]）** —— 生成一组 AgentCallbacks。这是把「SSE 事件」翻译成「dispatch」的地方：

```plaintext
闭包变量: aiMessageCreated=false; serverMessageId: string|null=null
resolveMessageId(event) = serverMessageId || event.messageId || messageId
// 惰性建首条 AI 消息的通用逻辑（多个事件都可能是"第一个到达的"）：
ensureAiMessage(event): 若 !aiMessageCreated → aiMessageCreated=true; serverMessageId = serverMessageId||event.messageId||messageId; dispatch(START_AI_MESSAGE,{messageId:serverMessageId})

返回对象：
onRunStarted(event):
  若 isContinueRun → dispatch(START_AI_MESSAGE,{messageId}); aiMessageCreated=true; serverMessageId=messageId
  否则 → onRunStart?.(event.runId || stateRef.current.activeRunId)
onTextMessageStart(event):
  若 isContinueRun → return
  若 !aiMessageCreated → aiMessageCreated=true; serverMessageId=event.messageId||messageId; dispatch(START_AI_MESSAGE,{messageId:serverMessageId})
onTextMessageContent(event):
  targetId = isContinueRun ? messageId : undefined
  dispatch(APPEND_AI_CONTENT, {delta: event.delta, messageId: targetId})
onTextMessageEnd(): dispatch(COMPLETE_AI_MESSAGE)
onThinkingStart(event): ensureAiMessage(event); dispatch(START_THINKING)
onThinkingContent(event): dispatch(UPDATE_THINKING, {delta: event.delta})
onThinkingEnd(): dispatch(COMPLETE_THINKING)
onToolCallStart(event):
  ensureAiMessage(event)
  targetMsgId = isContinueRun ? messageId : resolveMessageId(event)
  dispatch(TOOL_CALL_START, {messageId: targetMsgId, toolCallId: event.toolCallId, cardType: event.toolCallName, displayMessage: event.displayMessage})
onToolCallArgs(event):
  targetMsgId = isContinueRun ? messageId : resolveMessageId(event)
  dispatch(TOOL_CALL_ARGS, {messageId: targetMsgId, toolCallId: event.toolCallId, args: parseToolCallArgs(event)})
onToolCallEnd(event):
  targetMsgId = isContinueRun ? messageId : resolveMessageId(event)
  dispatch(TOOL_CALL_END, {messageId: targetMsgId, toolCallId: event.toolCallId, displayMessage: event.displayMessage})
  若 toolRegistry[event.toolCallName] 存在:  // 前端可执行工具 → 参数齐了就跑
    card = stateRef.current.messages.find(m=>m.id===targetMsgId)?.cards.find(c=>c.toolCallId===event.toolCallId)
    若 card → executeToolCall(event.toolCallName, event.toolCallId, targetMsgId, card.cardData)
onCustom(event): eventBus.emit(event.name, event.value); customEventHandlers?.[event.name]?.(event.value)
onRunFinished(event):  // 处理打断，详见 Phase 4
  targetMsgId = isContinueRun ? messageId : (serverMessageId || messageId)
  若 event.outcome?.type === 'interrupt':

    rawInterrupts = event.outcome.interrupts || [ ]

    threadId = stateRef.current.currentThreadId
    inputRequired = rawInterrupts.filter(reason==='input_required')
    confirmations = rawInterrupts.filter(reason==='confirmation')
    若 confirmations.length>0 且 !aiMessageCreated → 建 AI 消息（同 ensureAiMessage，targetMsgId=serverMessageId）
    若 inputRequired.length>0 → dispatch(SET_PENDING_INTERRUPT, {runId: event.runId, threadId, messageId: targetMsgId, interruptToolCallIds: inputRequired 里的 toolCallId 去空, interrupts: inputRequired.map(i=>({id:i.id, message:i.message, uiData: i.metadata?.uiData||{}}))})
    若 confirmations.length>0 → dispatch(SET_CUSTOM_INTERRUPTS, {messageId: targetMsgId, interrupts: confirmations.map(i=>({id:i.id, type:i.metadata?.type, uiData:i.metadata?.uiData, metadata:i.metadata, message:i.message, toolCallId:i.toolCallId, runId:event.runId, threadId, disabled:false}))})
  dispatch(FINISH_RUN); onRunFinish?.(event.runId)
onRunError(event): dispatch(SET_ERROR, {error: event.error||event.message, displayMessage: event.displayMessage})

onMessagesSnapshot(event): dispatch(MESSAGES_SNAPSHOT, {messages: event.messages||[]})


```

**switchThread(threadId)（useCallback，依赖 \[agentConfig, buildRunCallbacks\]）** —— 见 Phase 5 详解，此处给骨架：

```plaintext
agentRef.current?.abort(); dispatch(CLEAR_PENDING_INTERRUPT)

dispatch(SWITCH_THREAD, {threadId, messages:[]})   // 置 threadLoading=true

runId=`run_${generateId()}`; forwardedProps= 取 getForwardedProps()（失败{}）

input = { threadId, runId, messages:[], context:[], forwardedProps }

callbacks = buildRunCallbacks(`msg_${generateId()}`, false)
// 覆写 onRunError：历史加载失败走 SET_THREAD_LOAD_ERROR（不推误导性错误气泡）
switchCallbacks = { ...callbacks, onRunError: (e)=> dispatch(SET_THREAD_LOAD_ERROR, {error: e.displayMessage||e.error}) }
await agentRef.current?.run(input, switchCallbacks)

```
> 原理：切历史会话 = 用空 messages 对已存在 threadId 发一次标准 run，后端识别后回吐 `MESSAGES_SNAPSHOT` 加载历史。复用标准生命周期即可维护 isStreaming 等状态。

**continueRun(options)（useCallback，依赖 \[agentConfig, buildRunCallbacks\]）** —— 续跑（打断作答/工具回填）：

```plaintext
cur = stateRef.current; { userContent, resume, parentRunId, toolMessages } = options
若 cur.isStreaming 且 !resume 且 !toolMessages → return   // 正常流式中不允许普通续跑
runId=`run_${generateId()}`; threadId=cur.currentThreadId; 若无 threadId → return
dispatch(CLEAR_PENDING_INTERRUPT); dispatch(START_RUN, {runId})

messages = toolMessages ? toolMessages : (userContent ? [{id:`user_${generateId()}`, role:'user', content:userContent}] : [])

forwardedProps = 取值
continueMessageId = `msg_${generateId()}`; callbacks = buildRunCallbacks(continueMessageId, true)

input = { threadId, runId, parentRunId, resume, messages, context:[], forwardedProps }

await agentRef.current?.run(input, callbacks)

```

**sendMessage(content, options)（useCallback，依赖 \[agentConfig, buildRunCallbacks, onMessageSend\]）**：

```plaintext
cur = stateRef.current
若 cur.isStreaming 或 cur.threadLoading → return   // 流式中/加载中禁止发送
runId=`run_${generateId()}`; messageId=`msg_${generateId()}`; userId=`user_${generateId()}`
threadId = cur.currentThreadId; 若无 → threadId=`thread_${generateId()}`; dispatch(NEW_THREAD,{threadId})
dispatch(ADD_USER_MESSAGE, {id:userId, content}); dispatch(START_RUN, {runId})
onMessageSend?.(content)
forwardedProps = 取 getForwardedProps()（失败{}）；若 options.forwardedProps → 合并覆盖

input = { threadId, runId, messages:[{id:userId, role:'user', content}], context: options?.metadata ? [options.metadata] : [], forwardedProps }

callbacks = buildRunCallbacks(messageId, false)
await agentRef.current?.run(input, callbacks)

```

**sendMessageRef**：`const sendMessageRef = useRef(sendMessage); sendMessageRef.current = sendMessage`（供 executeToolCall / ToolContext 使用最新引用，避免闭包过期）。

**openModal（useCallback，依赖 \[openModalFn\]）**：若外部传入 openModalFn → 调它；否则返回 `Promise.resolve(null)`。

**value（useMemo）**：把上述所有动作 + state + 注册表 + 插槽相关组装成 `ChatContextValue`，依赖数组列全。返回 `<ChatContext.Provider value={value}>{children}</ChatContext.Provider>`。

**验收**：

*   [ ] 用 mock agent（
    
*   [ ] 
    
*   [ ] 「停止」（abortRun）在普通流式下调用 
    
*   [ ] agent 实例全程只创建一次。
    

---

## Task 1.10 — `context/useChat.ts`

```plaintext
useChat(): useContext(ChatContext)；为 null 时 throw new Error('useChat must be used within a ChatProvider')；否则返回 context
useCustomEvent(eventName, handler): useEffect 里 eventBus.on(eventName, handler)，返回值即取消订阅；依赖 [eventName, handler]

useAboveInput(id, node, deps=[]): 用 idRef 持有最新 id；useEffect 中 node!=null → registerAboveInput({id, node}) 否则 unregister；cleanup 时 unregister；依赖 [id, registerAboveInput, unregisterAboveInput, ...deps]


useSenderHeader(id, node, deps=[]): 同上，换成 senderHeader 系列


```

**验收**：`useChat` 在 Provider 外使用会抛错；`useAboveInput` 传入 node 会出现在 `aboveInputSlots`，传 null 或卸载会移除。

---

## Task 1.11 — `context/ModalManager.tsx`（命令式弹窗）

**职责**：`useModalManager(sendMessage)` 返回 `{ modalElement, openModal }`。`openModal` 返回 Promise，弹窗内组件通过 `resolve/reject` 决定 Promise 结果。

**逻辑**：

```plaintext
modalState = useState({ visible:false, component:null, props:{}, config:{}, resolve:null, reject:null })
resolveRef / rejectRef = useRef(null)
openModal(component, props={}, config={}) = new Promise((resolve, reject)=>{ 存 resolveRef/rejectRef; setModalState({visible:true, component, props, config, resolve, reject}) })
handleClose()  = rejectRef.current?.(); 复位 modalState; 清 refs      // 点遮罩
handleResolve(v)= resolveRef.current?.(v); 复位; 清 refs             // 组件确认
handleReject() = rejectRef.current?.(); 复位; 清 refs                // 组件取消
modalElement: 仅当 visible && component 时渲染：
  遮罩层 div（fixed 全屏，半透明黑底 rgba(0,0,0,0.45)，flex 居中，zIndex 1000，点击=handleClose）
  内容 div（白底、圆角、宽=config.width||520、maxWidth 90vw、maxHeight 80vh、overflow auto，点击 stopPropagation）
    若 config.title → 顶部标题条
    正文 padding 24：<Component resolve={handleResolve} reject={handleReject} sendMessage={sendMessage} {...props} />

```
> 说明：弹窗用内联样式 + CSS 变量（如 `var(--chat-color-bg,#fff)`），不依赖 antd Modal，保持轻量。

**验收**：`openModal(C)` 返回 Promise；C 内调 `resolve(x)` 使 Promise resolve(x) 并关闭；点遮罩使其 reject 并关闭。

---

## Task 1.12 — `context/index.ts`

```ts
export { ChatContext, ChatProvider } from './ChatProvider'
export { useChat, useCustomEvent, useAboveInput, useSenderHeader } from './useChat'
export { useModalManager } from './ModalManager'

```
---

## Phase 1 总验收

*   [ ] 
    
*   [ ] 写一个临时测试：
    
*   [ ] 依赖方向未被违反（context 不 import 具体组件；core 无 React）。
    

完成后进入 `02-phase2-shell-render.md`。