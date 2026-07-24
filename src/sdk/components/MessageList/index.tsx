import { Fragment, useEffect, useRef } from 'react'
import type { ComponentType } from 'react'
import { useChat } from '../../context'
import type { Message, MessageBubbleProps, MessageActionsConfig } from '../../core/types'
import MessageBubble from '../MessageBubble'
import MessageActionsBubble from '../MessageActionsBubble'
import styles from './index.module.css'

export interface MessageListProps {
  bubbleComponent?: ComponentType<MessageBubbleProps>
  messageActions?: MessageActionsConfig
}

/** 消息列表：遍历 state.messages 渲染气泡；新消息自动贴底，用户上滑时不打扰。 */
export default function MessageList({ bubbleComponent, messageActions }: MessageListProps) {
  const { state } = useChat()
  const { messages, isStreaming } = state
  const listRef = useRef<HTMLDivElement>(null)
  const isAutoScrollRef = useRef(true)
  const actionsEnabled = messageActions?.enabled !== false

  const renderBubble = (message: Message, isLastMessage: boolean) => {
    const BubbleComponent = bubbleComponent
    if (BubbleComponent) {
      return (
        <BubbleComponent message={message} isStreaming={isStreaming} isLastMessage={isLastMessage} />
      )
    }
    // MessageActionsBubble 增强气泡（用户消息暂停态显示复制/编辑）。
    if (actionsEnabled) {
      return (
        <MessageActionsBubble
          message={message}
          isStreaming={isStreaming}
          isLastMessage={isLastMessage}
          config={messageActions}
        />
      )
    }
    return <MessageBubble message={message} isStreaming={isStreaming} isLastMessage={isLastMessage} />
  }

  useEffect(() => {
    const el = listRef.current
    if (el && isAutoScrollRef.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages, isStreaming])

  const handleScroll = () => {
    const el = listRef.current
    if (!el) return
    isAutoScrollRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100
  }

  if (messages.length === 0) return null

  return (
    <div className={styles['messageList']} ref={listRef} onScroll={handleScroll}>
      {messages.map((m, i) => (
        <Fragment key={m.id}>{renderBubble(m, i === messages.length - 1)}</Fragment>
      ))}
    </div>
  )
}
