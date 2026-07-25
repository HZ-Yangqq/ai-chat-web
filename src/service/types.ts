// 接口类型定义

/** 发送消息 - 请求体 */
export interface ChatRequest {
  message: string;
  sessionId?: string;
}

/** 发送消息 - 响应数据（request 工具已解包外层 ApiResponse） */
export interface ChatResponseData {
  sessionId: string;
  reply: string;
}

/* ==================== 会话管理 ==================== */

/** 创建会话请求体（与 /api/chat/agent 参数一致） */
export interface CreateThreadRequest {
  runId?: string;
  messages: Array<{ id: string; role: string; content: string }>;
  context?: Array<{ name: string; value: any }>;
  forwardedProps?: Record<string, any>;
}

/** 创建会话响应 */
export interface CreateThreadResponse {
  threadId: string;
  threadName: string;
}

/** 会话列表项 */
export interface ThreadListItem {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  lastMessageStatus?: string | null;
}

/** 历史消息（含 status） */
export interface HistoryMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  thinking?: string;
  toolCalls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
  toolCallId?: string;
  name?: string;
  status?: string;
  pendingInterrupts?: { runId: string; interrupts: any[] };
}
