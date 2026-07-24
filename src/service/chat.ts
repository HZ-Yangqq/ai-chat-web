// Chat 相关 API

import { post } from './request';
import type { ChatRequest, ChatResponseData } from './types';

/** 发送消息 */
export function sendMessage(data: ChatRequest): Promise<ChatResponseData> {
  return post<ChatResponseData>('/chat/send', data);
}
