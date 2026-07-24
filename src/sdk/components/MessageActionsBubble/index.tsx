import { useState } from 'react'
import { App, Button, Input } from 'antd'
import { CopyOutlined, EditOutlined } from '@ant-design/icons'
import { useChat } from '../../context'
import type { MessageBubbleProps, MessageActionsConfig } from '../../core/types'
import MessageBubble from '../MessageBubble'
import styles from './index.module.css'

export type MessageActionsBubbleProps = MessageBubbleProps & { config?: MessageActionsConfig }

/**
 * 增强气泡：assistant 消息直接用基础 MessageBubble；用户消息在本轮被暂停
 * （lastRunAborted）时，于最后一条用户消息下追加复制/编辑操作与「您已暂停」提示。
 */
export default function MessageActionsBubble(props: MessageActionsBubbleProps) {
  const { message, config } = props
  const { message: msg } = App.useApp()
  const { state, sendMessage } = useChat()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const showCopy = config?.copy !== false
  const showEdit = config?.edit !== false

  if (message.role !== 'user') {
    return <MessageBubble {...props} />
  }

  const lastUserId = [...state.messages].reverse().find((m) => m.role === 'user')?.id
  const showActions = state.lastRunAborted && message.id === lastUserId

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content || '')
      msg.success('已复制')
    } catch {
      msg.error('复制失败')
    }
  }

  const handleEdit = () => {
    setDraft(message.content || '')
    setEditing(true)
  }

  const handleSend = () => {
    const content = draft.trim()
    if (!content) return
    setEditing(false)
    if (config?.onEditResend) {
      config.onEditResend(content, message)
    } else {
      void sendMessage(content)
    }
  }

  if (editing) {
    return (
      <div className={styles['editRow']}>
        <div className={styles['editBox']}>
          <Input.TextArea
            value={draft}
            autoSize={{ minRows: 2, maxRows: 6 }}
            variant="borderless"
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className={styles['editFooter']}>
            <Button onClick={() => setEditing(false)}>取消</Button>
            <Button type="primary" disabled={!draft.trim()} onClick={handleSend}>
              发送
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles['userRow']}>
      <div className={styles['userBubble']}>{message.content}</div>
      {showActions && (showCopy || showEdit) && (
        <>
          <div className={styles['actions']}>
            {showCopy && <CopyOutlined onClick={handleCopy} />}
            {showEdit && <EditOutlined onClick={handleEdit} />}
          </div>
          <div className={styles['pausedTip']}>您已暂停</div>
        </>
      )}
    </div>
  )
}
