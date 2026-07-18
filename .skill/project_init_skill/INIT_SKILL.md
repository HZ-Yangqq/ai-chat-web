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
- **样式**: SCSS（不用 LESS）
- **语言**: 中文（zh_CN）
- **路由**: react-router-dom 6 + 手动注册路由（约定式结构）

## 执行步骤

### 1. 创建项目目录

在项目父目录下创建新文件夹，例如 `my-app`：

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
    "preview": "vite preview"
  },
  "dependencies": {
    "@ant-design/icons": "^6.0.0",
    "@ant-design/x": "^1.0.0",
    "antd": "^5.22.0",
    "dayjs": "^1.11.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "sass": "^1.101.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0"
  }
}
```

> ⚠️ 注意：antd 必须用 `^5.22.0`，不能用 `^6.0.0`。因为 `@ant-design/x` 的 peer dependency 要求 antd 5.x。如果用了 antd 6，`npm install` 会报错。

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
    "noFallthroughCases": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}
```

### 4. 创建 vite.config.ts

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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

### 6. 创建 src/vite-env.d.ts（必须）

```ts
/// <reference types="vite/client" />

declare module '*.scss' {
  const content: Record<string, string>;
  export default content;
}

declare module '*.module.scss' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
```

> ⚠️ 这一步非常重要。如果不创建这个文件，TypeScript 会报错 `找不到"./index.scss"的副作用导入的模块或类型声明`。

### 7. 创建 src/index.scss

```scss
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
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-size: 18px;
  color: #999;
}
```

### 8. 创建 src/main.tsx

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { RouterProvider } from 'react-router-dom';
import router from './router';
import './index.scss';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN}>
      <RouterProvider router={router} />
    </ConfigProvider>
  </React.StrictMode>,
);
```

> 已内置 Ant Design 中文语言包，所有组件默认显示中文。**不使用 App.tsx**，路由直接接管页面渲染。

### 9. 创建路由配置

在 `src/` 下创建 `router/` 目录：

**src/router/generate.ts**（类型定义 + 注释）：
```ts
import React from 'react';

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

export interface RouteConfig {
  path: string;
  component: React.ComponentType;
  label?: string;
}
```

**src/router/index.tsx**（路由实例）：
```tsx
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
```

> ⚠️ 注意：不要使用 `import.meta.glob` 做动态路由扫描，Vite 的 glob 路径解析不稳定。改用手动注册路由，新增页面时在 `index.tsx` 中添加一行即可。

### 10. 创建 src 子目录结构和默认页面

在 `src/` 下创建以下目录，并放入默认内容：

```
src/
├── pages/
│   └── home/
│       ├── index.tsx           ← 默认首页
│       └── index.module.scss   ← 页面样式（CSS Modules）
├── components/
│   ├── index.ts
│   └── ChatInput.tsx
├── utils/
│   └── index.ts
├── constants/
│   └── index.ts
├── service/
│   ├── index.ts
│   ├── types.ts
│   └── chat.ts
├── router/
│   ├── generate.ts
│   └── index.tsx
├── main.tsx
└── index.scss
```

**各目录说明：**

- **pages/home/**：默认首页，对应路由 `/home`。每个页面使用一个文件夹，文件夹名即为路由路径。
- **components/**：全局可复用的 UI 组件。提供 `index.ts` 统一导出。
- **utils/**：纯函数工具，如防抖、格式化、校验等。提供 `index.ts` 统一导出。
- **constants/**：项目常量，如 API 地址、日期格式、枚举值等。提供 `index.ts` 统一导出。
- **service/**：API 接口层，分为 `types.ts`（接口类型定义）和具体的业务文件（如 `chat.ts`）。提供 `index.ts` 统一导出。

**目录模板文件：**

components/index.ts：
```ts
export { default as ChatInput } from './ChatInput';
```

utils/index.ts：
```ts
import dayjs from 'dayjs';
import { DATE_FORMAT, DATETIME_FORMAT } from '../constants';

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

export function formatDate(date: dayjs.Dayjs | string | Date, format = DATETIME_FORMAT): string {
  return dayjs(date).format(format);
}
```

constants/index.ts：
```ts
export const API_BASE_URL = '/api';
export const DATE_FORMAT = 'YYYY-MM-DD';
export const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
```

service/index.ts：
```ts
export * from './types';
export { sendMessage } from './chat';
```

service/types.ts（接口类型定义）：
```ts
export interface ChatRequest {
  message: string;
  sessionId?: string;
}

export interface ChatResponse {
  success: boolean;
  data?: { sessionId: string; reply: string };
  error?: string;
}
```

service/chat.ts（API 调用示例）：
```ts
import { API_BASE_URL } from '../constants';

export async function sendMessage(data: any): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/chat/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}
```

components/ChatInput.tsx（聊天输入框组件）：
```tsx
import { useState } from 'react';
import { Input } from 'antd';
import styles from './ChatInput.module.scss';

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

components/ChatInput.module.scss：
```scss
.container {
  width: 100%;
}
```

pages/home/index.module.scss（页面样式）：
```scss
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

.chat-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-tip {
  text-align: center;
  padding: 60px 0;
  color: #999;
}

.message-row {
  display: flex;
}

.user {
  justify-content: flex-end;
}

.assistant {
  justify-content: flex-start;
}

.bubble {
  padding: 10px 16px;
  border-radius: 12px;
  max-width: 70%;
  word-break: break-word;
}

.send-area {
  text-align: right;
}
```

pages/home/index.tsx（默认首页）：
```tsx
import { useState } from 'react';
import { Layout, Input, Button, Typography, Divider } from 'antd';
import styles from './index.module.scss';

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
```

### 11. 安装依赖

```bash
npm install
```

### 12. 创建 .gitignore

在项目根目录创建 `.gitignore` 文件：

```
# dependencies
node_modules/

# build output
dist/

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

# env
.env.local
.env.*.local
```

### 13. 初始化 Git 仓库

在项目根目录执行：

```bash
git init
git checkout -b master
```

> 默认创建 `master` 分支作为主分支。

## 验证启动

```bash
npm start
```

预期效果：浏览器打开 `http://localhost:5173`，页面正常渲染，显示 AI Chat 首页。

## 目录结构规范

```
src/
├── pages/          ← 页面组件（每个页面一个文件夹）
│   └── home/       ← /home 路径（默认页面）
│       ├── index.tsx
│       └── index.module.scss
├── router/         ← 路由配置
│   ├── generate.ts ← 类型定义 + 注释
│   └── index.tsx   ← 路由实例（手动注册）
├── components/     ← 全局复用组件
│   ├── index.ts    ← 统一导出
│   └── ChatInput.tsx
├── utils/          ← 公共工具函数
│   └── index.ts
├── constants/      ← 常量定义
│   └── index.ts
├── service/        ← API 接口定义与调用
│   ├── index.ts    ← 统一导出
│   ├── types.ts    ← 接口类型
│   └── chat.ts     ← 具体 API 调用
├── main.tsx        ← 入口文件（使用 RouterProvider）
└── index.scss      ← 全局样式
```

## 新增页面规则

- 在 `pages/` 下新建文件夹（文件夹名即为路由路径）
- 文件夹内创建 `index.tsx` 和 `index.module.scss`
- 在 `src/router/index.tsx` 中添加一行路由注册：

```tsx
const NewPage = React.lazy(() => import('../pages/new-page'));

// 在 createBrowserRouter 中添加：
{
  path: '/new-page',
  element: (
    <React.Suspense fallback={<div>Loading...</div>}>
      <NewPage />
    </React.Suspense>
  ),
}
```

## 常见坑

1. **antd 版本**：必须用 `^5.22.0`，不能用 `^6.0.0`。`@ant-design/x` 要求 antd 5.x。
2. **vite-env.d.ts**：必须创建，且需同时声明 `*.scss` 和 `*.module.scss`，否则 TS 报错。
3. **样式文件**：统一使用 `.scss`，不要用 `.less`。页面和组件样式推荐使用 CSS Modules（`.module.scss`）。
4. **禁止内联样式**：除非特殊情况（动态计算值），所有样式必须写在 `.scss` 文件中。
5. **不要用 `import.meta.glob`**：Vite 的 glob 路径解析不稳定，手动注册路由更可靠。
6. **不要用 `@/` 别名做 import**：Vite 的 `import` 语句不认 `@/` 别名，用相对路径 `../` 或 `./`。
7. **proxy 配置**：`vite.config.ts` 中的代理目标端口默认是 7001，根据实际后端端口调整。
8. **scripts**：启动命令是 `npm start`（映射到 `vite`），不是 `npm run dev`。
9. **没有 App.tsx**：路由直接接管页面渲染，不需要 App.tsx 文件。
