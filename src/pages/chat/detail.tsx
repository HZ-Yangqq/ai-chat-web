/**
 * 会话详情页：加载历史 + 检测 pending 自动重连 + 后续消息走 SDK 实时流
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChatSDK } from '@/sdk';
import type { AgentConfig, ChatSDKHandle } from '@/sdk';
import styles from './detail.module.css';

export default function ChatDetailPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const sdkRef = useRef<ChatSDKHandle>(null);
  const loadedThreadId = useRef<string | null>(null);
  const [skipAgentCall, setSkipAgentCall] = useState(false);

  // 检查是否为刚创建的新会话
  useEffect(() => {
    if (threadId) {
      const createdThreadId = localStorage.getItem('temp_created_thread_id');
      // 如果是新创建的会话，跳过 agent 调用
      if (createdThreadId === threadId) {
        setSkipAgentCall(true);
        
        // 清理临时存储
        localStorage.removeItem('temp_created_thread_id');
      }
    }
  }, [threadId]);

  const agent = useMemo<AgentConfig>(() => {
    const url = import.meta.env.VITE_CHAT_AGENT_URL as string | undefined;
    return { url: url || '/api/chat/agent' };
  }, []);

  // 切换会话时加载历史（SDK 内部 switchThread 会自动检测 pending 并重连）
  useEffect(() => {
    if (threadId && threadId !== loadedThreadId.current) {
      loadedThreadId.current = threadId;
      // 如果是新创建的会话，不调用 agent，直接 reconnect
      sdkRef.current?.switchThread(threadId, !skipAgentCall);
    }
  }, [threadId, skipAgentCall]);

  return (
    <div className={styles.detailContainer}>
      <ChatSDK
        ref={sdkRef}
        agent={agent}
        placeholder="输入消息... (Shift+Enter 换行)"
        onReady={() => {
          // 重置标志
          setSkipAgentCall(false);
        }}
      />
    </div>
  );
}
