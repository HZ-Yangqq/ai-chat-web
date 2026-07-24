import type { UnknownCardProps } from '../../core/types'
import styles from './index.module.css'

/** 未知卡兜底：既没注册专用组件、又没有 cardType 时的兜底展示。 */
export default function UnknownCard({ cardType, cardData }: UnknownCardProps) {
  return (
    <div className={styles['unknownCard']}>
      <div className={styles['title']}>未知卡片类型：{cardType || '(空)'}</div>
      <pre className={styles['data']}>{JSON.stringify(cardData, null, 2)}</pre>
    </div>
  )
}
