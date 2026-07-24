import { useChat } from '../../context'
import type { CustomInterrupt } from '../../core/types'
import styles from './index.module.css'

export interface CustomInterruptRendererProps {
  interrupts: CustomInterrupt[]
}

/** 自定义打断分发器：按 type 路由到使用方注册的组件（interruptComponents[type]）。 */
export default function CustomInterruptRenderer({ interrupts }: CustomInterruptRendererProps) {
  const { interruptComponents, continueRun, sendMessage } = useChat()
  if (!interrupts?.length) return null
  return (
    <>
      {interrupts.map((item) => {
        const Component = interruptComponents[item.type]
        if (!Component) {
          return (
            <div key={item.id} className={styles['fallback']}>
              {item.message || `未注册的自定义打断组件：${item.type}`}
            </div>
          )
        }
        return (
          <div key={item.id} className={styles['slot']}>
            <Component
              interrupt={{
                id: item.id,
                type: item.type,
                uiData: item.uiData,
                metadata: item.metadata,
                message: item.message,
                toolCallId: item.toolCallId,
                runId: item.runId,
                threadId: item.threadId,
              }}
              disabled={!!item.disabled}
              continueRun={continueRun}
              sendMessage={sendMessage}
            />
          </div>
        )
      })}
    </>
  )
}
