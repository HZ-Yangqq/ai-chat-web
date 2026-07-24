import { useState } from 'react'
import { XMarkdown } from '@ant-design/x-markdown'
import type { ComponentProps } from '@ant-design/x-markdown'
import { EyeOutlined, UpOutlined, DownOutlined } from '@ant-design/icons'
import type { MarkdownRendererProps } from '../../core/types'
import styles from './index.module.css'

/** 匹配 markdown 表格块：连续的以 | 开头的行。 */
const TABLE_BLOCK_RE = /(?:^[ \t]*\|.+(?:\n|$))+/gm
/** 单换行（前后都不是换行）：普通文本里需补成双换行。 */
const SINGLE_NEWLINE_RE = /(?<!\n)\n(?!\n)/g

/**
 * 修正 markdown 换行：表格块之外的普通文本把单换行替换成双换行（保证段落分隔），
 * 表格块本身原样保留（不能破坏表格语法）。
 */
function normalizeContent(text: string): string {
  let result = ''
  let lastIndex = 0
  let match: RegExpExecArray | null
  TABLE_BLOCK_RE.lastIndex = 0
  while ((match = TABLE_BLOCK_RE.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index)
    result += before.replace(SINGLE_NEWLINE_RE, '\n\n')
    result += match[0]
    lastIndex = match.index + match[0].length
  }
  result += text.slice(lastIndex).replace(SINGLE_NEWLINE_RE, '\n\n')
  return result
}

/** 覆盖 markdown 的 table 渲染：可折叠表格。 */
function CollapsibleTable(props: ComponentProps) {
  const [expanded, setExpanded] = useState(true)
  // 剔除 XMarkdown 注入的非 DOM 属性，避免透传到真实 <table>。
  const { domNode: _domNode, streamStatus: _streamStatus, lang: _lang, block: _block, children, ...rest } = props
  return (
    <div className={styles['tableContainer']}>
      <div className={styles['tableHeader']} onClick={() => setExpanded((v) => !v)}>
        <EyeOutlined />
        <span>{expanded ? '收起表格' : '展开表格'}</span>
        {expanded ? <UpOutlined /> : <DownOutlined />}
      </div>
      {expanded && (
        <div className={styles['tableWrapper']}>
          <table {...rest}>{children}</table>
        </div>
      )}
    </div>
  )
}

/** Markdown 渲染器：用 @ant-design/x-markdown 渲染，表格用可折叠组件包裹。 */
export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) return null
  const textContent = typeof content === 'string' ? normalizeContent(content) : JSON.stringify(content)
  return (
    <div className={styles['markdown']}>
      <XMarkdown components={{ table: CollapsibleTable }}>{textContent}</XMarkdown>
    </div>
  )
}
