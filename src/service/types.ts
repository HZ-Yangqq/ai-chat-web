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
