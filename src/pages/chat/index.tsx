/**
 * 新建会话页：欢迎区 + 输入框
 * 发送首条消息 → 调 createThread → 跳转到会话详情页
 */
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button, Spin } from 'antd';
import { ArrowUpOutlined } from '@ant-design/icons';
import { createThread } from '@/service/chat';
import styles from './index.module.css';

const { TextArea } = Input;

export default function NewChatPage() {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = useCallback(async () => {
    const content = value.trim();
    if (!content || loading) return;

    setLoading(true);
    try {
      const { threadId } = await createThread({
        messages: [{ id: `user_${Date.now()}`, role: 'user', content }],
        context: [],
        forwardedProps: {},
      });
      // 触发事件通知 Sidebar 刷新列表
      window.dispatchEvent(new CustomEvent('newThreadCreated'));
      navigate(`/chat/${threadId}`, { replace: true });
    } catch (err) {
      console.error('[NewChat] createThread failed:', err);
    } finally {
      setLoading(false);
    }
  }, [value, loading, navigate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.welcomeArea}>
        <h1 className={styles.title}>开始一段新的对话吧</h1>
      </div>
      <div className={styles.inputArea}>
        <div className={styles.inputWrapper}>
          <TextArea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Shift+Enter 换行)"
            autoSize={{ minRows: 1, maxRows: 6 }}
            disabled={loading}
            className={styles.textarea}
          />
          <Button
            type="primary"
            shape="circle"
            size="small"
            icon={loading ? <Spin size="small" /> : <ArrowUpOutlined />}
            onClick={handleSend}
            disabled={!value.trim() || loading}
            className={styles.sendBtn}
          />
        </div>
      </div>
    </div>
  );
}
