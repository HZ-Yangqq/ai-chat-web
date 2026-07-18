// 接口定义示例

export interface ChatRequest {
  message: string;
  sessionId?: string;
}

export interface ChatResponse {
  success: boolean;
  data?: {
    sessionId: string;
    reply: string;
  };
  error?: string;
}
