/**
 * 气泡+加号 图标（新建会话）
 */
import type { CSSProperties } from 'react';

interface MessagePlusIconProps {
  size?: number;
  color?: string;
  style?: CSSProperties;
}

export default function MessagePlusIcon({ size = 16, color = 'currentColor', style }: MessagePlusIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {/* 气泡主体 */}
      <path d="M21 12a8 8 0 0 1-8 8H4l2.5-2.5A8 8 0 1 1 21 12z" />
      {/* 加号 */}
      <line x1="13" y1="9" x2="13" y2="15" />
      <line x1="10" y1="12" x2="16" y2="12" />
    </svg>
  );
}
