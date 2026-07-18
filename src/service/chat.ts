// API 调用示例

import { API_BASE_URL } from '../constants';
import { ChatRequest, ChatResponse } from './types';

export async function sendMessage(data: ChatRequest): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE_URL}/chat/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}
