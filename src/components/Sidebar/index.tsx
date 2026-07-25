/**
 * 侧边栏：新建会话按钮 + 会话历史列表
 */
import { useCallback, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Popconfirm, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { getThreadList, deleteThread } from '@/service/chat';
import type { ThreadListItem } from '@/service/types';
import styles from './index.module.css';

export interface SidebarHandle {
  refresh: () => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const Sidebar = forwardRef<SidebarHandle>(function Sidebar(_props, ref) {
  const navigate = useNavigate();
  const { threadId: activeThreadId } = useParams<{ threadId: string }>();
  const [threads, setThreads] = useState<ThreadListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchThreads = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getThreadList();
      setThreads(list);
    } catch {
      // 静默失败
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  useImperativeHandle(ref, () => ({ refresh: fetchThreads }), [fetchThreads]);

  const handleCreate = () => {
    navigate('/chat');
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await deleteThread(id);
      setThreads(prev => prev.filter(t => t.id !== id));
      if (activeThreadId === id) {
        navigate('/chat');
      }
      message.success('已删除');
    } catch {
      message.error('删除失败');
    }
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.brand}>Yang Chat</div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          block
          onClick={handleCreate}
        >
          新建会话
        </Button>
      </div>
      <div className={styles.list}>
        {loading && !threads.length && (
          <div className={styles.empty}>加载中...</div>
        )}
        {!loading && !threads.length && (
          <div className={styles.empty}>暂无会话</div>
        )}
        {threads.map(thread => (
          <div
            key={thread.id}
            className={`${styles.item} ${thread.id === activeThreadId ? styles.active : ''}`}
            onClick={() => navigate(`/chat/${thread.id}`)}
          >
            <div className={styles.itemContent}>
              <div className={styles.itemTitle}>{thread.title}</div>
              <div className={styles.itemTime}>{formatTime(thread.updatedAt)}</div>
            </div>
            <Popconfirm
              title="确定删除该会话？"
              onConfirm={(e) => handleDelete(thread.id, e as any)}
              onCancel={(e) => e?.stopPropagation()}
              okText="删除"
              cancelText="取消"
            >
              <DeleteOutlined
                className={styles.itemDelete}
                onClick={(e) => e.stopPropagation()}
              />
            </Popconfirm>
          </div>
        ))}
      </div>
    </aside>
  );
});

export default Sidebar;
