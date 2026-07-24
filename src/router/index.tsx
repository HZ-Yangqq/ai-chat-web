import { createBrowserRouter, Navigate } from 'react-router-dom';
import { generateRoutes } from './generate';

// 自动生成路由 + 手动补充特殊路由
const router = createBrowserRouter([
  // 根路径重定向到 /home
  {
    path: '/',
    element: <Navigate to="/home" replace />,
  },
  // 约定式路由（自动扫描 pages/ 目录）
  ...generateRoutes(),
  // 404 兜底
  {
    path: '*',
    element: <div className="not-found">404 - 页面不存在</div>,
  },
]);

export default router;
