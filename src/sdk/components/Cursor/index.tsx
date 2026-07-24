import styles from './index.module.css'

/** 流式光标：一个闪烁的小竖条，表示 AI 正在输出。 */
export default function Cursor() {
  return <span className={styles['cursor']} />
}
