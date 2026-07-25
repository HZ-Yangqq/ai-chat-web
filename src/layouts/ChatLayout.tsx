/**
 * Chat 布局：左侧 Sidebar（会话列表）+ 右侧内容区（Outlet）
 */
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import styles from './ChatLayout.module.css';

export default function ChatLayout() {
  return (
    <div className={styles.chatLayout}>
      <Sidebar />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
