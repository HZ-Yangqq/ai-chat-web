import { LoadingOutlined } from '@ant-design/icons'
import styles from './index.module.css'

export interface ThinkingIndicatorProps {
  text?: string
}

/** 思考中指示器：尚无任何内容时的等待反馈。 */
export default function ThinkingIndicator({ text = '思考中…' }: ThinkingIndicatorProps) {
  return (
    <div className={styles['indicator']}>
      <LoadingOutlined spin />
      <span>{text}</span>
    </div>
  )
}
