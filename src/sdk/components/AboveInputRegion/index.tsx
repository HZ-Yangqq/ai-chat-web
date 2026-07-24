import { Component, type ReactNode } from 'react'
import { useChat } from '../../context'
import styles from './index.module.css'

/** 插槽错误边界：单个插槽抛错时返回 null，不影响其它插槽。 */
class SlotErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}

/** 输入框上方插槽区：渲染注册到 aboveInputSlots 的节点（通用打断容器挂在这里）。 */
export default function AboveInputRegion() {
  const { aboveInputSlots } = useChat()
  if (aboveInputSlots.size === 0) return null
  const sorted = Array.from(aboveInputSlots.values()).sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
  )
  return (
    <div className={styles['aboveInputRegion']}>
      {sorted.map((entry) => (
        <SlotErrorBoundary key={entry.id}>{entry.node}</SlotErrorBoundary>
      ))}
    </div>
  )
}
