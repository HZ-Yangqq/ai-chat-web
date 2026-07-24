// 首页

import { useState } from 'react';
import { Layout, Input, Button, Typography, Divider } from 'antd';
import styles from './index.module.css';

const { Header, Content } = Layout;
const { Text } = Typography;
const { TextArea } = Input;

function Home() {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMsg = { role: 'user', content: inputValue };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');

    setTimeout(() => {
      const aiMsg = { role: 'assistant', content: `收到你的消息："${userMsg.content}"，这是模拟回复。` };
      setMessages((prev) => [...prev, aiMsg]);
    }, 500);
  };

  return (
    <Layout className={styles.layout}>
      <Header className={styles.header}>
        <Text className={styles.title}>AI Chat</Text>
      </Header>
      <Content className={styles.content}>
        <div className={styles.chatContainer}>
          {messages.length === 0 && (
            <div className={styles.emptyTip}>
              <Text type="secondary">开始一段对话吧！</Text>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`${styles.messageRow} ${msg.role === 'user' ? styles.user : styles.assistant}`}>
              <div className={styles.bubble}>{msg.content}</div>
            </div>
          ))}
          <Divider style={{ margin: 0 }} />
          <TextArea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="输入消息... (Shift+Enter 换行)"
            autoSize={{ minRows: 3, maxRows: 6 }}
          />
          <div className={styles.sendArea}>
            <Button type="primary" onClick={handleSend} disabled={!inputValue.trim()}>
              发送
            </Button>
          </div>
        </div>
      </Content>
    </Layout>
  );
}

export default Home;
