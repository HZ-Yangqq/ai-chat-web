import { createBrowserRouter, Navigate } from 'react-router-dom';
import React from 'react';

// 懒加载 home 页面
const Home = React.lazy(() => import('../pages/home'));

// 创建路由实例
const router = createBrowserRouter([
  // 重定向根路径到 /home
  {
    path: '/',
    element: <Navigate to="/home" replace />,
  },
  // 手动注册路由
  {
    path: '/home',
    element: (
      <React.Suspense fallback={<div>Loading...</div>}>
        <Home />
      </React.Suspense>
    ),
  },
  // 404 兜底
  {
    path: '*',
    element: <div className="not-found">404 - Page Not Found</div>,
  },
]);

export default router;
