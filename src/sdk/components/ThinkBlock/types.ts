import type { ContentBlock } from '../../core/types'

export interface ThinkBlockProps {
  content: string
  status: Extract<ContentBlock, { type: 'thinking' }>['status']
}
