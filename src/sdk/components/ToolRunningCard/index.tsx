import { useState } from 'react'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import { useChat } from '../../context'
import styles from './index.module.css'

export interface ToolRunningCardProps {
  toolCallName: string
  cardComplete: boolean
  toolCallId?: string
  cardData?: Record<string, any>
}

/** 通用工具执行卡（SDK 内置）：状态图标 + 状态文案 + 可展开的工具名与入参。 */
export default function ToolRunningCard({
  toolCallName,
  cardComplete,
  toolCallId,
  cardData,
}: ToolRunningCardProps) {
  const { state } = useChat()
  const [expanded, setExpanded] = useState(false)

  const exec = toolCallId ? state.toolExecutions[toolCallId] : undefined
  const statusConfig = exec?.statusConfig

  const isError = exec?.phase === 'error'
  const isDone = exec ? exec.phase === 'success' || exec.phase === 'error' : cardComplete

  const label = isError
    ? statusConfig?.error || '执行失败'
    : isDone
      ? statusConfig?.success || cardData?.endDisplayMessage || '执行完成'
      : statusConfig?.pending || cardData?.displayMessage || '执行中...'

  const params = Object.fromEntries(
    Object.entries(cardData || {}).filter(
      ([k]) => k !== 'displayMessage' && k !== 'endDisplayMessage',
    ),
  )
  const hasParams = Object.keys(params).length > 0

  return (
    <div className={styles['card']}>
      <div className={styles['header']} onClick={() => setExpanded((v) => !v)}>
        {isError ? (
          <CloseCircleOutlined className={styles['errorIcon']} />
        ) : isDone ? (
          <CheckCircleOutlined className={styles['successIcon']} />
        ) : (
          <LoadingOutlined className={styles['loadingIcon']} spin />
        )}
        <span className={styles['label']}>{label}</span>
        <DownOutlined
          className={`${styles['arrow']} ${expanded ? styles['arrowOpen'] : ''}`}
        />
      </div>
      {expanded && (
        <div className={styles['body']}>
          <div className={styles['toolName']}>{toolCallName}</div>
          {hasParams && (
            <pre className={styles['paramsBox']}>{JSON.stringify(params, null, 2)}</pre>
          )}
        </div>
      )}
    </div>
  )
}
