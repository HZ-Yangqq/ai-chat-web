// 首页：接入 Chat SDK

import { useMemo } from 'react';
import { DefaultLayout } from '@/layouts';
import { ChatSDK } from '@/sdk';
import type { AgentConfig } from '@/sdk';
import { mockAgentFn } from './mockAgent';
import styles from './index.module.css';

function Home() {
  // 有 VITE_CHAT_AGENT_URL 则走真实 SSE 后端，否则用本地 mock 兜底演示。
  const agent = useMemo<AgentConfig>(() => {
    const url = import.meta.env.VITE_CHAT_AGENT_URL as string | undefined;
    if (url) return { url };
    return { url: '', mock: mockAgentFn };
  }, []);

  return (
    <DefaultLayout>
      <div className={styles.chatContainer}>
        <ChatSDK
          agent={agent}
          placeholder="输入消息... (Shift+Enter 换行)"
          welcome={<div className={styles.welcome}>开始一段对话吧！</div>}
        />
      </div>
    </DefaultLayout>
  );
}

export default Home;
