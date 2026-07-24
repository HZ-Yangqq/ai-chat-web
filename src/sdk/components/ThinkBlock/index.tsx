import { useEffect, useState } from 'react'
import { Think } from '@ant-design/x'
import type { ThinkBlockProps } from './types'
import styles from './index.module.css'

export type { ThinkBlockProps } from './types'

/** 思考过程块：可折叠展示思考文本；流式中默认展开且标题闪烁，完成后自动收起。 */
export default function ThinkBlock({ content, status }: ThinkBlockProps) {
  const complete = status === 'done'
  const [expanded, setExpanded] = useState(!complete)

  useEffect(() => {
    if (complete) setExpanded(false)
  }, [complete])

  if (!content) return null

  return (
    <Think
      loading={false}
      blink={!complete}
      title={<span className={styles['thinkTitle']}>{complete ? '思考过程' : '深度思考中'}</span>}
      expanded={expanded}
      onExpand={setExpanded}
      className={styles['thinkBlock']}
      classNames={{ status: styles['statusPill'] }}
    >
      {content}
    </Think>
  )
}
