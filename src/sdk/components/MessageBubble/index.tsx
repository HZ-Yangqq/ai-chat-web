import { ThoughtChain } from '@ant-design/x'
import { useChat } from '../../context'
import type { MessageBubbleProps } from '../../core/types'
import MarkdownRenderer from '../MarkdownRenderer'
import Cursor from '../Cursor'
import ThinkBlock from '../ThinkBlock'
import CardRenderer from '../CardRenderer'
import CustomInterruptRenderer from '../CustomInterruptRenderer'
import styles from './index.module.css'

/** 单条消息气泡：用户=纯文本；AI=遍历 contentBlocks 分块渲染。 */
export default function MessageBubble({ message }: MessageBubbleProps) {
  const { state } = useChat()
  const isUser = message.role === 'user'
  const isStreaming = message.status === 'streaming'
  const isError = message.status === 'error'

  // 打断等待提示：本条有未处理自定义打断，或本条触发了通用打断，且已停止流式。
  const hasActiveCustomInterrupt = message.customInterrupts?.some((ci) => !ci.disabled)
  const isPendingGeneric =
    state.pendingInterrupt?.messageId === message.id && !state.pendingInterrupt?.disabled
  const showWaiting = !isUser && !isStreaming && (hasActiveCustomInterrupt || isPendingGeneric)

  // 是否显示光标：流式中，且最后一个块「已经有可视内容」时才显示。
  const shouldShowCursor = (() => {
    if (!isStreaming) return false
    const blocks = message.contentBlocks || []
    if (blocks.length === 0) return false
    const last = blocks[blocks.length - 1]
    if (last.type === 'thinking') return last.status === 'done'
    if (last.type === 'text') return !!last.content
    if (last.type === 'card') return true
    return false
  })()

  const renderBlocks = () => {
    const blocks = message.contentBlocks || []
    if (blocks.length === 0 && message.content) {
      return <MarkdownRenderer content={message.content} />
    }
    return blocks.map((block, i) => {
      if (block.type === 'thinking' && block.content) {
        return <ThinkBlock key={i} content={block.content} status={block.status} />
      }
      if (block.type === 'text' && block.content) {
        return <MarkdownRenderer key={i} content={block.content} />
      }
      if (block.type === 'card' && block.toolCallId) {
        const card = message.cards.find((c) => c.toolCallId === block.toolCallId)
        if (card && !card.cardHidden) {
          return (
            <CardRenderer
              key={i}
              cardType={card.cardType}
              cardData={card.cardData}
              messageId={message.id}
              toolCallId={card.toolCallId}
              disabled={card.cardDisabled}
              isStreaming={isStreaming}
              cardComplete={card.cardComplete}
            />
          )
        }
        return null
      }
      return null
    })
  }

  return (
    <div className={`${styles['messageBubble']} ${isUser ? styles['userMessage'] : ''}`}>
      <div
        className={`${styles['content']} ${isUser ? styles['userContent'] : styles['aiContent']}`}
      >
        <div className={`${styles['bubble']} ${isUser ? styles['userBubble'] : styles['aiBubble']}`}>
          {isUser ? (
            <span>{message.content}</span>
          ) : (
            <>
              {isError && !message.content && !message.errorMessage ? (
                <span className={styles['errorFallback']}>服务出错啦～ 请重试！</span>
              ) : (
                renderBlocks()
              )}
              {showWaiting && (
                <ThoughtChain.Item blink variant="text" title="正在等待用户澄清..." />
              )}
              {message.customInterrupts && message.customInterrupts.length > 0 && (
                <CustomInterruptRenderer interrupts={message.customInterrupts} />
              )}
              {shouldShowCursor && <Cursor />}
            </>
          )}
        </div>
        {isError && (
          <span className={styles['errorText']}>
            {message.errorMessage || '回复生成失败，请重试'}
          </span>
        )}
      </div>
    </div>
  )
}
