import { useChat } from '../../context'
import type { QuickAction, ActionContext } from '../../core/types'
import styles from './index.module.css'

export interface QuickActionsProps {
  actions: QuickAction[]
}

/** 欢迎态快捷动作：一排入口按钮，点击调用 action.onClick(ctx)。 */
export default function QuickActions({ actions }: QuickActionsProps) {
  const { state, sendMessage, openModal } = useChat()

  const handleClick = (action: QuickAction) => {
    const ctx: ActionContext = {
      close: () => {},
      sendMessage,
      openModal,
      getState: () => state,
    }
    action.onClick?.(ctx)
  }

  if (!actions || actions.length === 0) return null

  return (
    <div className={styles['quickActions']}>
      {actions.map((action) => (
        <button
          key={action.key}
          type="button"
          className={styles['actionItem']}
          onClick={() => handleClick(action)}
        >
          {action.icon && <span className={styles['actionIcon']}>{action.icon}</span>}
          <span className={styles['actionBody']}>
            <span className={styles['actionLabel']}>{action.label}</span>
            {action.description && (
              <span className={styles['actionDesc']}>{action.description}</span>
            )}
          </span>
        </button>
      ))}
    </div>
  )
}
