/**
 * SDK 所有 TypeScript 类型的单一事实来源（SSOT）。
 * 这些是跨层接口契约，命名必须与文档一致。
 */
import type { ComponentType, ReactNode } from 'react'

/* ============================================================
 * Agent / 协议
 * ========================================================== */

export interface AgentRequest {
  threadId: string
  runId: string
  parentRunId?: string
  messages: ChatMessage[]
  context?: any[]
  forwardedProps?: Record<string, any>
  resume?: ResumePayload[]
  headers?: Record<string, string>
}

export interface AgentError {
  message: string
  code?: string
  details?: any
}

export interface RunAgentInput {
  threadId: string
  runId: string
  parentRunId?: string
  messages: ChatMessage[]
  context?: any[]
  forwardedProps?: Record<string, any>
  resume?: ResumePayload[]
}

export type AgentEventCallback = (event: any) => void

/** 为 §5 每类事件各留一个可选回调，签名统一 (event: any) => void。 */
export interface AgentCallbacks {
  onRunStarted?: AgentEventCallback
  onRunFinished?: AgentEventCallback
  onRunError?: AgentEventCallback
  onTextMessageStart?: AgentEventCallback
  onTextMessageContent?: AgentEventCallback
  onTextMessageEnd?: AgentEventCallback
  onToolCallStart?: AgentEventCallback
  onToolCallArgs?: AgentEventCallback
  onToolCallEnd?: AgentEventCallback
  onToolCallResult?: AgentEventCallback
  onThinkingStart?: AgentEventCallback
  onThinkingContent?: AgentEventCallback
  onThinkingEnd?: AgentEventCallback
  onMessagesSnapshot?: AgentEventCallback
  onCustom?: AgentEventCallback
  onStateSnapshot?: AgentEventCallback
  onStateDelta?: AgentEventCallback
}

export type MockAgentFn = (
  input: RunAgentInput,
  callbacks: AgentCallbacks,
) => { abort: () => void }

export interface AgentConfig {
  url: string
  requestInterceptor?: (request: AgentRequest) => AgentRequest | Promise<AgentRequest>
  getForwardedProps?: () => Record<string, any> | Promise<Record<string, any>>
  onError?: (error: AgentError) => void
  mock?: MockAgentFn
  timeout?: number
}

export interface AgentInstance {
  run: (input: RunAgentInput, callbacks: AgentCallbacks) => void
  abort: () => void
}

/* ============================================================
 * 消息
 * ========================================================== */

/** 发给后端的精简结构。 */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  name?: string
  toolCallId?: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  status: 'streaming' | 'complete' | 'error'
  contentBlocks: ContentBlock[]
  cards: Card[]
  errorMessage?: string
  customInterrupts?: CustomInterrupt[]
  fromHistory?: boolean
  thinking?: string
}

export type ContentBlock =
  | { type: 'thinking'; content: string; status: 'thinking' | 'done' }
  | { type: 'text'; content: string }
  | { type: 'card'; toolCallId: string }

export interface Card {
  toolCallId: string
  cardType: string
  cardData: Record<string, any>
  cardComplete: boolean
  cardDisabled: boolean
  cardHidden?: boolean
}

export interface Thread {
  id: string
  title?: string
  createdAt?: string
}

/* ============================================================
 * 打断
 * ========================================================== */

export interface GenericQuestionOption {
  value: string
  label: string
  description?: string
  recommended?: boolean
  allowInput?: boolean
  customPlaceholder?: string
}

export interface GenericQuestion {
  key: string
  title: string
  type: 'radio' | 'checkbox' | 'select' | 'input' | 'textarea' | string
  required?: boolean
  placeholder?: string
  options?: GenericQuestionOption[]
}

export interface GenericInterruptUiData {
  title?: string
  submitText?: string
  dismissText?: string
  questions?: GenericQuestion[]
}

export interface GenericInterrupt {
  id: string
  message?: string
  uiData: GenericInterruptUiData
}

export interface PendingInterrupt {
  runId: string
  threadId: string
  messageId: string
  interrupts: GenericInterrupt[]
  disabled?: boolean
}

export interface CustomInterrupt {
  id: string
  type: string
  uiData: any
  metadata?: Record<string, any>
  message?: string
  toolCallId?: string
  runId: string
  threadId: string
  disabled?: boolean
}

export interface CustomInterruptData<T = any> {
  id: string
  type: string
  uiData: T
  metadata?: Record<string, any>
  message?: string
  toolCallId?: string
  runId: string
  threadId: string
}

export interface CustomInterruptProps<T = any> {
  interrupt: CustomInterruptData<T>
  disabled: boolean
  continueRun: (o: ContinueRunOptions) => void
  sendMessage: SendMessageFn
}

export type InterruptComponentRegistry = Record<string, ComponentType<CustomInterruptProps>>

export interface QuestionControlProps {
  question: GenericQuestion
  value: any
  onChange: (v: any) => void
  disabled?: boolean
  interrupt: GenericInterrupt
}

export type QuestionComponentRegistry = Record<string, ComponentType<QuestionControlProps>>

export interface ResumePayload {
  interruptId: string
  status: 'resolved' | 'cancelled'
  payload?: any
}

export interface ContinueRunOptions {
  userContent?: string
  resume?: ResumePayload[]
  parentRunId?: string
  toolMessages?: ChatMessage[]
}

/* ============================================================
 * 卡片 / 工具
 * ========================================================== */

export interface CardProps<T = Record<string, any>> {
  cardType: string
  toolCallId: string
  messageId: string
  cardData: T
  cardComplete: boolean
  disabled: boolean
  isStreaming: boolean
  sendMessage: (c: string, o?: SendMessageOptions) => void
}

export type CardRegistry = Record<string, ComponentType<CardProps<any>>>

export interface ToolStatus {
  pending: string
  success?: string
  error?: string
  icon?: ReactNode
}

export interface ToolContext {
  toolCallId: string
  messageId: string
  sendMessage: SendMessageFn
  getState: () => ChatState
  reportResult: (r: any) => void
}

export interface ToolDefinition {
  execute: (args: Record<string, any>, ctx: ToolContext) => Promise<any>
  status?: ToolStatus
  confirm?: boolean | string
  showInHistory?: boolean
  retry?: { maxAttempts: number; delay?: number }
}

export type ToolRegistry = Record<string, ToolDefinition>

export interface ToolExecutionState {
  toolCallId: string
  toolCallName: string
  phase: 'pending' | 'executing' | 'success' | 'error' | 'cancelled'
  statusConfig?: ToolStatus
  result?: any
  error?: Error
}

/* ============================================================
 * 认证 / 弹窗 / 动作 / 插槽
 * ========================================================== */

export interface UserInfo {
  name: string
  avatar?: string
  [k: string]: any
}

export interface AuthAdapter {
  isLoggedIn: () => boolean | Promise<boolean>
  login: () => Promise<UserInfo>
  logout: () => Promise<void>
  getUserInfo: () => UserInfo | null
  LoginComponent?: ComponentType
}

export type SendMessageFn = (content: string, options?: SendMessageOptions) => Promise<void>

export interface SendMessageOptions {
  type?: string
  metadata?: Record<string, any>
  forwardedProps?: Record<string, any>
}

export interface ModalContentProps {
  resolve: (v?: any) => void
  reject: () => void
  sendMessage: SendMessageFn
}

export type OpenModalFn = <T = any>(
  component: ComponentType<ModalContentProps>,
  props?: Record<string, any>,
  config?: { title?: string; width?: number },
) => Promise<T | null>

export interface ActionContext {
  close: () => void
  sendMessage: SendMessageFn
  openModal: OpenModalFn
  getState: () => ChatState
}

export interface AboveInputEntry {
  id: string
  node: ReactNode
  priority?: number
}

export interface QuickAction {
  key: string
  label: string
  icon?: ReactNode
  description?: string
  onClick?: (ctx: ActionContext) => void
}

/* ============================================================
 * 主题 / 布局 / 覆盖
 * ========================================================== */

export interface ThemeConfig {
  colorPrimary?: string
  colorBgContainer?: string
  colorBgElevated?: string
  colorText?: string
  colorTextSecondary?: string
  colorBorder?: string
  colorBorderSecondary?: string
  colorSuccess?: string
  colorError?: string
  borderRadiusBubble?: number
  borderRadiusCard?: number
  borderRadiusToolbarBtn?: number
  fontSizeMessage?: number
  fontSizeToolbar?: number
  heightToolbarBtn?: number
  paddingContainer?: number
}

export interface LayoutConfig {
  toolbarPosition?: 'bottom' | 'top' | 'hidden'
  inputPosition?: 'bottom' | 'float'
}

export interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
  isLastMessage?: boolean
  renderContentBlock?: (b: ContentBlock, i: number) => ReactNode
  renderInterrupt?: () => ReactNode | null
  renderTimestamp?: () => ReactNode | null
}

export interface ChatInputProps {
  onSend: (c: string) => void
  onCancel: () => void
  isStreaming: boolean
  placeholder?: string
  disabled?: boolean
  footer?: ReactNode
}

export interface MarkdownRendererProps {
  content: string
}

export interface ThinkingBlockProps {
  thinking: string
  isComplete: boolean
}

export interface UnknownCardProps {
  cardType: string
  cardData: Record<string, any>
}

export interface ComponentOverrides {
  MessageBubble?: ComponentType<MessageBubbleProps>
  ChatInput?: ComponentType<ChatInputProps>
  MarkdownRenderer?: ComponentType<MarkdownRendererProps>
  ThinkingBlock?: ComponentType<ThinkingBlockProps>
  UnknownCard?: ComponentType<UnknownCardProps>
}

export interface MessageActionsConfig {
  enabled?: boolean
  copy?: boolean
  edit?: boolean
  onEditResend?: (content: string, message: Message) => void
}

/* ============================================================
 * 顶层 Props / 命令句柄 / State / Context
 * ========================================================== */

export interface ChatSDKProps {
  agent: AgentConfig
  authAdapter?: AuthAdapter
  components?: ComponentOverrides
  messageActions?: MessageActionsConfig
  theme?: ThemeConfig
  layout?: LayoutConfig
  cards?: CardRegistry
  tools?: ToolRegistry
  interruptComponents?: InterruptComponentRegistry
  questionComponents?: QuestionComponentRegistry
  customEventHandlers?: Record<string, (value: any) => void>
  children?: ReactNode
  placeholder?: string
  welcome?: ReactNode
  quickActions?: QuickAction[]
  senderFooter?: ReactNode
  onReady?: () => void
  onError?: (e: Error) => void
  onMessageSend?: (c: string) => void
  onRunStart?: (runId: string) => void
  onRunFinish?: (runId: string) => void
}

export interface ChatSDKHandle {
  switchThread: (id: string, forceAgentCall?: boolean) => Promise<void>
  createThread: (existingThreadId?: string) => Promise<void>
  getThreadId: () => string
}

export interface ChatState {
  isLoggedIn: boolean
  userInfo: UserInfo | null
  currentThreadId: string
  threads: Thread[]
  threadLoading: boolean
  threadLoadError: string | null
  messages: Message[]
  activeRunId: string | null
  lastRunId: string | null
  isStreaming: boolean
  lastRunAborted: boolean
  error: string | null
  historyPanelVisible: boolean
  pendingInterrupt: PendingInterrupt | null
  toolExecutions: Record<string, ToolExecutionState>
}

export interface ChatContextValue {
  state: ChatState
  sendMessage: SendMessageFn
  continueRun: (o: ContinueRunOptions) => void
  abortRun: () => void
  createThread: () => Promise<void>
  switchThread: (id: string) => Promise<void>
  toggleHistoryPanel: () => void
  login: () => Promise<void>
  logout: () => Promise<void>
  openModal: OpenModalFn
  cardRegistry: CardRegistry
  toolRegistry: ToolRegistry
  interruptComponents: InterruptComponentRegistry
  questionComponents: QuestionComponentRegistry
  aboveInputSlots: Map<string, AboveInputEntry>
  registerAboveInput: (e: AboveInputEntry) => void
  unregisterAboveInput: (id: string) => void
  senderHeaderSlots: Map<string, AboveInputEntry>
  registerSenderHeader: (e: AboveInputEntry) => void
  unregisterSenderHeader: (id: string) => void
}
