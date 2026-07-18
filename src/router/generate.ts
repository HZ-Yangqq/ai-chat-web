/**
 * 约定式路由生成器
 *
 * 规则：
 * - pages/home/ → /home
 * - pages/about/ → /about
 *
 * 新增页面只需在 pages/ 下建文件夹并添加 index.tsx，
 * 然后在 src/router/index.tsx 中添加路由注册即可。
 */

import React from 'react';

// 路由配置类型
export interface RouteConfig {
  path: string;
  component: React.ComponentType;
  label?: string;
}
