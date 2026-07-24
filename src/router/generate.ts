/**
 * 约定式路由生成器
 *
 * 规则：
 * - pages/home/index.tsx      → /home
 * - pages/about/index.tsx     → /about
 * - pages/user/profile/index.tsx → /user/profile
 *
 * 新增页面只需在 pages/ 下建文件夹并添加 index.tsx，路由自动注册。
 * 可选：在页面目录下创建 route.ts 导出 RouteMeta 来配置路由元信息。
 */

import React from 'react';
import type { RouteObject } from 'react-router-dom';

/** 路由元信息（可选，放在页面目录下的 route.ts 中导出） */
export interface RouteMeta {
  /** 页面标题 */
  title?: string;
  /** 是否在导航中隐藏 */
  hidden?: boolean;
  /** 自定义排序（数字越小越靠前） */
  order?: number;
}

// 自动扫描 pages 下所有 index.tsx 作为页面组件
const pageModules = import.meta.glob<{ default: React.ComponentType }>(
  '../pages/**/index.tsx'
);

// 自动扫描 pages 下所有 route.ts 作为路由元信息
const metaModules = import.meta.glob<{ default: RouteMeta }>(
  '../pages/**/route.ts',
  { eager: true }
);

/** 从文件路径提取路由 path，如 ../pages/home/index.tsx → /home */
function extractRoutePath(filePath: string): string {
  // 去掉前缀 ../pages/ 和后缀 /index.tsx
  const relative = filePath
    .replace('../pages/', '')
    .replace('/index.tsx', '');

  // pages/index.tsx → / (根路由)
  if (relative === 'index') return '/';

  return `/${relative}`;
}

/** 从文件路径提取对应的 route.ts 路径 */
function extractMetaPath(filePath: string): string {
  return filePath.replace('index.tsx', 'route.ts');
}

/** 生成路由配置数组 */
export function generateRoutes(): RouteObject[] {
  const routes: RouteObject[] = [];

  for (const [filePath, loader] of Object.entries(pageModules)) {
    const path = extractRoutePath(filePath);
    const metaPath = extractMetaPath(filePath);
    const meta = metaModules[metaPath]?.default;

    const LazyComponent = React.lazy(loader);

    routes.push({
      path,
      element: React.createElement(
        React.Suspense,
        { fallback: React.createElement('div', { className: 'page-loading' }, '加载中...') },
        React.createElement(LazyComponent)
      ),
      handle: meta, // 路由元信息挂在 handle 上
    });
  }

  // 按 order 排序
  routes.sort((a, b) => {
    const orderA = (a.handle as RouteMeta)?.order ?? 999;
    const orderB = (b.handle as RouteMeta)?.order ?? 999;
    return orderA - orderB;
  });

  return routes;
}
