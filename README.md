# AI Chat Web

基于 React 18 + Ant Design 5 + Vite 6 的前端应用模板，提供 AI 聊天对话界面。

## 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite 6
- **UI 库**: Ant Design 5.22 + Ant Design X
- **图标库**: @ant-design/icons 6.x
- **路由**: react-router-dom 7（约定式路由）
- **样式**: 纯 CSS + CSS Modules（`.module.css`）
- **代码规范**: ESLint + Prettier
- **时间处理**: dayjs
- **路径别名**: `@/` → `src/`

## 快速开始

```bash
# 安装依赖
npm i

# 启动开发服务器
npm start

# 构建生产版本
npm run build

# 代码检查
npm run lint

# 格式化代码
npm run format
```

启动后访问 `http://localhost:5173`。

## 项目结构

```
src/
├── assets/         ← 静态资源（图片、字体）
├── components/     ← 全局共享组件
├── constants/      ← 常量（读取环境变量）
├── hooks/          ← 自定义 Hook
├── layouts/        ← 布局组件
├── pages/          ← 页面（约定式路由，建目录即注册）
│   └── home/
├── router/         ← 路由（自动扫描生成）
├── service/        ← API 层（统一 request 封装）
├── types/          ← 全局类型定义
├── utils/          ← 工具函数
├── index.css       ← 全局样式
└── main.tsx        ← 入口文件
```

## 新增页面（约定式路由）

无需手动注册路由，只需：

1. 在 `src/pages/` 下新建文件夹，添加 `index.tsx`（默认导出组件）
2. 路由自动注册，路径 = 目录路径（如 `pages/about/index.tsx` → `/about`）
3. 可选：创建 `route.ts` 配置路由元信息（标题、排序）

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `VITE_API_BASE_URL` | API 基础地址 | `/api` |
| `VITE_APP_TITLE` | 应用标题 | `AI Chat` |

本地覆盖请创建 `.env.local`（已 gitignore）。

## API 代理

开发环境下，所有 `/api` 请求自动代理到后端 `http://localhost:7001`。

如需修改代理目标，编辑 `vite.config.ts` 中的 `server.proxy` 配置。

## 注意事项

- antd 版本必须为 5.x（Ant Design X 要求）
- 样式统一使用纯 CSS，禁止 SCSS/LESS，禁止内联样式
- 组件样式使用 CSS Modules（`.module.css`）
- 所有 import 使用 `@/` 路径别名
