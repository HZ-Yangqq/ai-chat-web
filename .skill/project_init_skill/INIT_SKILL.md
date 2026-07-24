# React + Ant Design 5 + Vite 前端项目初始化 Skill

当用户要求创建一个新的 React 前端项目时，按照以下步骤执行。

## 项目定位

这是一个面向 AI 聊天类应用的标准前端模板，技术栈固定：

- **框架**: React 18 + TypeScript
- **构建工具**: Vite 6
- **UI 库**: Ant Design 5.22+（注意：不是 6.x）
- **AI 组件**: Ant Design X
- **图标库**: @ant-design/icons 6.x
- **时间处理**: dayjs
- **样式**: 纯 CSS + CSS Modules（`.module.css`），禁止使用 SCSS/LESS
- **语言**: 中文（zh_CN）
- **路由**: react-router-dom 7 + 约定式路由（`import.meta.glob` 自动扫描）
- **代码规范**: ESLint + Prettier
- **路径别名**: `@/` → `src/`
- **环境变量**: `.env` + `import.meta.env`

## 执行步骤

### 1. 创建项目目录

```bash
mkdir my-app
cd my-app
```

### 2. 创建 package.json

```json
{
  "name": "my-app",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\""
  },
  "dependencies": {
    "@ant-design/icons": "^6.0.0",
    "@ant-design/x": "^1.0.0",
    "antd": "^5.22.0",
    "dayjs": "^1.11.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^7.18.1"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "eslint": "^10.8.0",
    "eslint-config-prettier": "^10.1.8",
    "eslint-plugin-react-hooks": "^7.1.1",
    "eslint-plugin-react-refresh": "^0.5.3",
    "prettier": "^3.9.6",
    "typescript": "^5.6.0",
    "typescript-eslint": "^8.65.0",
    "vite": "^6.0.0"
  }
}
```

> ⚠️ 注意：antd 必须用 `^5.22.0`，不能用 `^6.0.0`。因为 `@ant-design/x` 的 peer dependency 要求 antd 5.x。

### 3. 创建 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"]
}
```

### 4. 创建 vite.config.ts

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:7001',
        changeOrigin: true,
      },
    },
  },
});
```

> 默认将 `/api` 代理到后端的 `http://localhost:7001`。如果后端端口不同，修改 `target` 即可。

### 5. 创建 index.html

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI Chat</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### 6. 创建环境变量文件

**.env**（开发环境）：
```
# 开发环境配置
VITE_API_BASE_URL=/api
VITE_APP_TITLE=AI Chat
```

**.env.production**（生产环境）：
```
# 生产环境配置
VITE_API_BASE_URL=/api
VITE_APP_TITLE=AI Chat
```

### 7. 创建 eslint.config.js

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  prettier
);
```

### 8. 创建 .prettierrc

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2,
  "endOfLine": "auto"
}
```

### 9. 创建 .gitignore

```
# dependencies
node_modules/

# build output
dist/

# typescript build info
*.tsbuildinfo

# editor
.vscode/*
!.vscode/extensions.json
.idea/

# OS
.DS_Store
Thumbs.db

# logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# env (local overrides)
.env.local
.env.*.local
```

### 10. 创建 src/vite-env.d.ts（必须）

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_TITLE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
```

> ⚠️ 这一步非常重要。如果不创建这个文件，TypeScript 会报错找不到 CSS 模块的类型声明。

### 11. 创建 src/index.css（全局样式）

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #root {
  height: 100%;
  width: 100%;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, 'Noto Sans', sans-serif;
}

.not-found {
  text-align: center;
  padding: 100px;
}

.page-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  color: #999;
  font-size: 14px;
}
```

### 12. 创建 src/main.tsx

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { RouterProvider } from 'react-router-dom';
import router from '@/router';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN}>
      <RouterProvider router={router} />
    </ConfigProvider>
  </React.StrictMode>,
);
```

> 已内置 Ant Design 中文语言包。**不使用 App.tsx**，路由直接接管页面渲染。

### 13. 创建 src/constants/index.ts

```ts
// 常量定义

// API 基础地址（从环境变量读取）
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// 应用标题
export const APP_TITLE = import.meta.env.VITE_APP_TITLE || 'AI Chat';

// 日期格式常量
export const DATE_FORMAT = 'YYYY-MM-DD';
export const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
```

### 14. 创建约定式路由

**src/router/generate.ts**（路由自动生成器）：
```ts
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
  const relative = filePath
    .replace('../pages/', '')
    .replace('/index.tsx', '');

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
      handle: meta,
    });
  }

  routes.sort((a, b) => {
    const orderA = (a.handle as RouteMeta)?.order ?? 999;
    const orderB = (b.handle as RouteMeta)?.order ?? 999;
    return orderA - orderB;
  });

  return routes;
}
```

**src/router/index.tsx**（路由实例）：
```tsx
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
```

### 15. 创建 src/layouts/（布局组件）

**src/layouts/DefaultLayout.tsx**：
```tsx
/**
 * 默认布局组件
 * 提供统一的页面结构（顶栏 + 内容区）
 */

import type { ReactNode } from 'react';
import { Layout, Typography } from 'antd';
import { APP_TITLE } from '@/constants';
import styles from './index.module.css';

const { Header, Content } = Layout;
const { Text } = Typography;

interface DefaultLayoutProps {
  children: ReactNode;
}

export default function DefaultLayout({ children }: DefaultLayoutProps) {
  return (
    <Layout className={styles.layout}>
      <Header className={styles.header}>
        <Text className={styles.title}>{APP_TITLE}</Text>
      </Header>
      <Content className={styles.content}>{children}</Content>
    </Layout>
  );
}
```

**src/layouts/index.module.css**：
```css
.layout {
  min-height: 100vh;
}

.header {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.title {
  font-size: 20px;
  font-weight: bold;
}

.content {
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}
```

**src/layouts/index.ts**：
```ts
// 布局组件导出

export { default as DefaultLayout } from './DefaultLayout';
```

### 16. 创建 src/components/（全局组件）

**src/components/ChatInput.tsx**：
```tsx
import { useState } from 'react';
import { Input } from 'antd';
import styles from './ChatInput.module.css';

const { TextArea } = Input;

interface ChatInputProps {
  onSend: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function ChatInput({ onSend, placeholder = '输入消息...', disabled = false }: ChatInputProps) {
  const [value, setValue] = useState('');

  const handleSend = () => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue('');
  };

  return (
    <div className={styles.container}>
      <TextArea
        className={styles.textarea}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onPressEnter={(e) => {
          if (!e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder={placeholder}
        autoSize={{ minRows: 3, maxRows: 6 }}
        disabled={disabled}
      />
    </div>
  );
}
```

**src/components/ChatInput.module.css**：
```css
.container {
  width: 100%;
}

.textarea {
  width: 100%;
}
```

**src/components/index.ts**：
```ts
// 全局组件示例

export { default as ChatInput } from './ChatInput';
```

### 17. 创建 src/service/（API 层）

**src/service/request.ts**（统一请求封装）：
```ts
/**
 * 统一请求封装
 * - 自动拼接 baseURL
 * - 统一错误处理
 * - 支持请求/响应拦截
 */

import { API_BASE_URL } from '@/constants';

/** 通用响应结构 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: number;
}

/** 请求配置 */
export interface RequestOptions extends Omit<RequestInit, 'body'> {
  /** 请求体（会自动 JSON.stringify） */
  body?: unknown;
  /** 是否跳过错误提示 */
  silent?: boolean;
  /** 超时时间（ms），默认 30000 */
  timeout?: number;
}

/** 请求错误 */
export class RequestError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.name = 'RequestError';
    this.code = code;
  }
}

/** 核心请求方法 */
async function request<T = unknown>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, silent, timeout = 30000, headers, ...restInit } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${API_BASE_URL}${url}`, {
      ...restInit,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body != null ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!res.ok) {
      const errMsg = `请求失败: ${res.status} ${res.statusText}`;
      if (!silent) console.error(`[Request Error] ${url}`, errMsg);
      throw new RequestError(errMsg, res.status);
    }

    const data: ApiResponse<T> = await res.json();

    if (!data.success) {
      const errMsg = data.error || '未知业务错误';
      if (!silent) console.error(`[Business Error] ${url}`, errMsg);
      throw new RequestError(errMsg, data.code ?? -1);
    }

    return data.data as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new RequestError(`请求超时 (${timeout}ms)`, 408);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** GET 请求 */
export function get<T = unknown>(url: string, options?: RequestOptions): Promise<T> {
  return request<T>(url, { ...options, method: 'GET' });
}

/** POST 请求 */
export function post<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<T> {
  return request<T>(url, { ...options, method: 'POST', body });
}

/** PUT 请求 */
export function put<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<T> {
  return request<T>(url, { ...options, method: 'PUT', body });
}

/** DELETE 请求 */
export function del<T = unknown>(url: string, options?: RequestOptions): Promise<T> {
  return request<T>(url, { ...options, method: 'DELETE' });
}

export default request;
```

**src/service/types.ts**：
```ts
// 接口类型定义

/** 发送消息 - 请求体 */
export interface ChatRequest {
  message: string;
  sessionId?: string;
}

/** 发送消息 - 响应数据（request 工具已解包外层 ApiResponse） */
export interface ChatResponseData {
  sessionId: string;
  reply: string;
}
```

**src/service/chat.ts**：
```ts
// Chat 相关 API

import { post } from './request';
import type { ChatRequest, ChatResponseData } from './types';

/** 发送消息 */
export function sendMessage(data: ChatRequest): Promise<ChatResponseData> {
  return post<ChatResponseData>('/chat/send', data);
}
```

**src/service/index.ts**：
```ts
// Service 层统一导出

export * from './types';
export { sendMessage } from './chat';
export { get, post, put, del, RequestError } from './request';
export type { ApiResponse, RequestOptions } from './request';
```

### 18. 创建 src/pages/home/（默认首页）

**src/pages/home/index.tsx**：
```tsx
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
```

**src/pages/home/index.module.css**：
```css
.chatContainer {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.emptyTip {
  text-align: center;
  padding: 60px 0;
  color: #999;
}

.messageRow {
  text-align: left;
}

.messageRow.user {
  text-align: right;
}

.bubble {
  display: inline-block;
  padding: 10px 16px;
  border-radius: 12px;
  max-width: 70%;
  word-break: break-word;
}

.bubble_user {
  background: #1677ff;
  color: #fff;
}

.bubble_assistant {
  background: #f0f0f0;
  color: #333;
}
```

**src/pages/home/route.ts**（可选路由元信息）：
```ts
import type { RouteMeta } from '@/router/generate';

const meta: RouteMeta = {
  title: '首页',
  order: 1,
};

export default meta;
```

### 19. 创建其余目录文件

**src/hooks/index.ts**：
```ts
// 自定义 Hooks

export {};
```

**src/types/index.ts**：
```ts
// 全局类型定义

/** 通用分页参数 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/** 通用分页响应 */
export interface PaginatedData<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

**src/utils/index.ts**：
```ts
import dayjs from 'dayjs';
import { DATETIME_FORMAT } from '@/constants';

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * 格式化日期
 */
export function formatDate(date: dayjs.Dayjs | string | Date, format = DATETIME_FORMAT): string {
  return dayjs(date).format(format);
}
```

**src/assets/.gitkeep**：
```
此目录用于存放静态资源（图片、字体、SVG 图标等）。
```

### 20. 安装依赖

```bash
npm install
```

### 21. 初始化 Git 仓库

```bash
git init
git checkout -b master
```

## 验证启动

```bash
npm start
```

预期效果：浏览器打开 `http://localhost:5173`，页面正常渲染，显示 AI Chat 首页。

## 最终目录结构

```
my-app/
├── .env                    ← 开发环境变量
├── .env.production         ← 生产环境变量
├── .gitignore
├── .prettierrc
├── eslint.config.js
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── assets/             ← 静态资源（图片、字体）
    ├── components/         ← 全局共享组件
    │   ├── index.ts
    │   ├── ChatInput.tsx
    │   └── ChatInput.module.css
    ├── constants/          ← 常量（读取环境变量）
    │   └── index.ts
    ├── hooks/              ← 自定义 Hook
    │   └── index.ts
    ├── layouts/            ← 布局组件
    │   ├── index.ts
    │   ├── DefaultLayout.tsx
    │   └── index.module.css
    ├── pages/              ← 页面（约定式路由，建目录即注册）
    │   └── home/
    │       ├── index.tsx
    │       ├── index.module.css
    │       └── route.ts
    ├── router/             ← 路由（自动生成）
    │   ├── generate.ts
    │   └── index.tsx
    ├── service/            ← API 层（统一 request 封装）
    │   ├── index.ts
    │   ├── request.ts
    │   ├── types.ts
    │   └── chat.ts
    ├── types/              ← 全局类型定义
    │   └── index.ts
    ├── utils/              ← 工具函数
    │   └── index.ts
    ├── index.css           ← 全局样式
    ├── main.tsx            ← 入口
    └── vite-env.d.ts       ← 类型声明
```

## 新增页面规则（约定式路由）

新增页面**无需修改路由文件**，只需：

1. 在 `src/pages/` 下新建文件夹，添加 `index.tsx`
2. 路由自动注册，路径 = 目录路径

示例：
- `pages/about/index.tsx` → `/about`
- `pages/user/profile/index.tsx` → `/user/profile`

可选：创建 `route.ts` 配置路由元信息（标题、排序等）：
```ts
import type { RouteMeta } from '@/router/generate';

const meta: RouteMeta = {
  title: '关于',
  order: 2,
};

export default meta;
```

## 常见坑

1. **antd 版本**：必须用 `^5.22.0`，不能用 `^6.0.0`。`@ant-design/x` 要求 antd 5.x。
2. **vite-env.d.ts**：必须创建，且需声明 `*.css` 和 `*.module.css`，否则 TS 报错。
3. **样式文件**：统一使用纯 CSS（`.module.css`），禁止使用 SCSS/LESS 预处理器。
4. **禁止内联样式**：除非特殊情况（动态计算值），所有样式必须写在 `.css` 文件中。
5. **路径别名**：所有 import 使用 `@/` 别名（如 `@/constants`），不用相对路径 `../`。
6. **proxy 配置**：`vite.config.ts` 中的代理目标端口默认是 7001，根据实际后端端口调整。
7. **scripts**：启动命令是 `npm start`（映射到 `vite`），不是 `npm run dev`。
8. **没有 App.tsx**：路由直接接管页面渲染，不需要 App.tsx 文件。
9. **环境变量**：必须以 `VITE_` 前缀命名才能在前端代码中通过 `import.meta.env` 访问。
10. **约定式路由**：基于 `import.meta.glob` 实现，页面组件必须默认导出（`export default`）。
