import { useChat } from '../../context'
import type { CardProps } from '../../core/types'
import ToolRunningCard from '../ToolRunningCard'
import UnknownCard from '../UnknownCard'

export interface CardRendererProps {
  cardType: string
  cardData: Record<string, any>
  messageId: string
  toolCallId: string
  disabled: boolean
  isStreaming: boolean
  cardComplete: boolean
}

/**
 * 工具卡分发器：根据 cardType 分派到
 * 使用方注册的专用卡片 / SDK 内置通用工具卡 / 未知卡。
 */
export default function CardRenderer({
  cardType,
  cardData,
  messageId,
  toolCallId,
  disabled,
  isStreaming,
  cardComplete,
}: CardRendererProps) {
  const { cardRegistry, sendMessage } = useChat()
  const CardComponent = cardRegistry[cardType]

  if (!CardComponent) {
    if (cardType) {
      return (
        <ToolRunningCard
          toolCallName={cardType}
          cardComplete={cardComplete}
          toolCallId={toolCallId}
          cardData={cardData}
        />
      )
    }
    return <UnknownCard cardType={cardType} cardData={cardData} />
  }

  const props: CardProps = {
    cardType,
    toolCallId,
    messageId,
    cardData,
    cardComplete,
    disabled,
    isStreaming,
    sendMessage,
  }
  return <CardComponent {...props} />
}
