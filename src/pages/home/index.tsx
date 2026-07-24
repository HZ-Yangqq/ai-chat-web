// 首页

import { useState } from 'react';
import { Typography, Divider } from 'antd';
import { DefaultLayout } from '@/layouts';
import { ChatInput } from '@/components';
import styles from './index.module.css';

const { Text } = Typography;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function Home() {
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSend = (content: string) => {
    const userMsg: Message = { role: 'user', content };
    setMessages((prev) => [...prev, userMsg]);

    // 模拟 AI 回复
    setTimeout(() => {
      const aiMsg: Message = { role: 'assistant', content: `收到你的消息："${content}"，这是模拟回复。` };
      setMessages((prev) => [...prev, aiMsg]);
    }, 500);
  };

  return (
    <DefaultLayout>
      <div className={styles.chatContainer}>
        {messages.length === 0 && (
          <div className={styles.emptyTip}>
            <Text type="secondary">开始一段对话吧！</Text>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`${styles.messageRow} ${styles[msg.role]}`}>
            <div className={`${styles.bubble} ${styles[`bubble_${msg.role}`]}`}>
              {msg.content}
            </div>
          </div>
        ))}
        <Divider style={{ margin: 0 }} />
        <ChatInput onSend={handleSend} placeholder="输入消息... (Shift+Enter 换行)" />
      </div>
    </DefaultLayout>
  );
}

export default Home;
