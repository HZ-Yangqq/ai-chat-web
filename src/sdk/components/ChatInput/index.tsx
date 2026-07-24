import { useMemo, useState } from 'react'
import { Sender } from '@ant-design/x'
import { Flex } from 'antd'
import { useChat } from '../../context'
import type { ChatInputProps } from '../../core/types'
import styles from './index.module.css'

/**
 * 底部输入框（基于 Sender）。回车发送；本轮任务进行中（流式生成或存在未处理打断）
 * 按钮变「停止」并触发 abortRun；支持 Sender 顶部插槽与自定义 footer。
 */
export default function ChatInput({ placeholder, disabled, footer }: ChatInputProps) {
  const { state, sendMessage, abortRun, senderHeaderSlots } = useChat()
  const { isStreaming, threadLoading } = state
  const [value, setValue] = useState('')

  // 本轮任务是否仍在进行：流式中，或存在未处理打断（通用 / 自定义）。
  const inProgress = useMemo(
    () =>
      isStreaming ||
      (!!state.pendingInterrupt && !state.pendingInterrupt.disabled) ||
      !!state.messages?.some((msg) => msg.customInterrupts?.some((ci) => !ci.disabled)),
    [isStreaming, state.pendingInterrupt, state.messages],
  )

  const headerContent = useMemo(() => {
    if (senderHeaderSlots.size === 0) return undefined
    const sorted = Array.from(senderHeaderSlots.values()).sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
    )
    return () => (
      <div className={styles['senderHeader']}>
        {sorted.map((entry) => (
          <div key={entry.id}>{entry.node}</div>
        ))}
      </div>
    )
  }, [senderHeaderSlots])

  const handleSend = (content: string) => {
    const trimmed = content.trim()
    if (!trimmed) return
    void sendMessage(trimmed)
    setValue('')
  }

  const handleCancel = () => {
    abortRun()
  }

  return (
    <div className={styles['chatInput']}>
      <Sender
        value={value}
        onChange={setValue}
        placeholder={placeholder}
        disabled={disabled || threadLoading}
        loading={inProgress}
        onSubmit={handleSend}
        onCancel={handleCancel}
        allowSpeech={false}
        suffix={false}
        header={headerContent}
        footer={(actionNode) => (
          <Flex align="center" justify="space-between" className={styles['footerBar']}>
            <div>{footer}</div>
            {actionNode}
          </Flex>
        )}
      />
    </div>
  )
}
