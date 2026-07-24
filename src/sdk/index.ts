/**
 * Chat SDK 总出口。
 */
export { default as ChatSDK } from './ChatSDK'

// 类型（全部来自 core/types）
export type * from './core/types'

// 常量与工具
export { EVENT_TYPE, MESSAGE_ROLE, MESSAGE_STATUS } from './core/constants'
export type { EventType, MessageRole, MessageStatus } from './core/constants'
export { EventBus, eventBus } from './core/eventBus'
export { createAgent } from './core/agent'

// Context & Hooks
export { ChatProvider } from './context/ChatProvider'
export { useChat, useCustomEvent, useAboveInput, useSenderHeader } from './context/useChat'

// Components（15 个）
export {
  MessageList,
  MessageBubble,
  MessageActionsBubble,
  MarkdownRenderer,
  ThinkBlock,
  CardRenderer,
  GenericInterruptContainer,
  GenericInterruptSlot,
  CustomInterruptRenderer,
  UnknownCard,
  ChatInput,
  QuickActions,
  Cursor,
  AboveInputRegion,
  ThinkingIndicator,
} from './components'
