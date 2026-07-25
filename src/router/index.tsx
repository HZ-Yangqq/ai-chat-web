import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import ChatLayout from '@/layouts/ChatLayout';

// Chat 页面懒加载
const NewChatPage = React.lazy(() => import('@/pages/chat/index'));
const ChatDetailPage = React.lazy(() => import('@/pages/chat/detail'));

function LazyWrap({ children }: { children: React.ReactNode }) {
  return (
    <React.Suspense fallback={<div className="page-loading">加载中...</div>}>
      {children}
    </React.Suspense>
  );
}

const router = createBrowserRouter([
  // 根路径重定向到 /chat
  { path: '/', element: <Navigate to="/chat" replace /> },
  // Chat 路由（嵌套布局：Sidebar + 内容区）
  {
    path: '/chat',
    element: <ChatLayout />,
    children: [
      { index: true, element: <LazyWrap><NewChatPage /></LazyWrap> },
      { path: ':threadId', element: <LazyWrap><ChatDetailPage /></LazyWrap> },
    ],
  },
  // 兼容旧 /home 路径
  { path: '/home', element: <Navigate to="/chat" replace /> },
  // 404 兜底
  { path: '*', element: <div className="not-found">404 - 页面不存在</div> },
]);

export default router;
