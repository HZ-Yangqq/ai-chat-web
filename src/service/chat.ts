// Chat 相关 API

import { get, post, del } from './request';
import type {
  ChatRequest,
  ChatResponseData,
  CreateThreadRequest,
  CreateThreadResponse,
  ThreadListItem,
  HistoryMessage,
} from './types';

/** 发送消息（旧接口，保留兼容） */
export function sendMessage(data: ChatRequest): Promise<ChatResponseData> {
  return post<ChatResponseData>('/chat/send', data);
}

/** 创建会话并在后台启动 run */
export function createThread(data: CreateThreadRequest): Promise<CreateThreadResponse> {
  return post<CreateThreadResponse>('/chat/createThread', data);
}

/** 获取会话列表 */
export function getThreadList(): Promise<ThreadListItem[]> {
  return get<ThreadListItem[]>('/chat/threads');
}

/** 获取指定会话的历史消息 */
export function getThreadHistory(threadId: string): Promise<HistoryMessage[]> {
  return get<HistoryMessage[]>(`/chat/threads/${threadId}/history`);
}

/** 删除会话 */
export function deleteThread(threadId: string): Promise<void> {
  return del<void>(`/chat/threads/${threadId}`);
}
