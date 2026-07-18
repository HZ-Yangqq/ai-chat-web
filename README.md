# AI Chat Web

基于 React 18 + Ant Design 5 + Vite 6 的前端应用，提供 AI 聊天对话界面。

## 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite 6
- **UI 库**: Ant Design 5.22 + Ant Design X
- **图标库**: @ant-design/icons
- **路由**: react-router-dom
- **样式**: SCSS（CSS Modules）
- **时间处理**: dayjs

## 快速开始

```bash
# 安装依赖
npm i

# 启动开发服务器
npm start

# 构建生产版本
npm run build
```

启动后访问 `http://localhost:5173`。

## 项目结构

```
src/
├── pages/          ← 页面组件（每个页面一个文件夹）
│   └── home/       ← 首页（/home 路由）
├── router/         ← 路由配置
├── components/     ← 全局复用组件
├── utils/          ← 公共工具函数
├── constants/      ← 常量定义
├── service/        ← API 接口层
├── main.tsx        ← 入口文件
└── index.scss      ← 全局样式
```

## 新增页面

1. 在 `src/pages/` 下新建文件夹（文件夹名即为路由路径）
2. 创建 `index.tsx` 和 `index.module.scss`
3. 在 `src/router/index.tsx` 中添加路由注册

## API 代理

开发环境下，所有 `/api` 请求自动代理到后端 `http://localhost:7001`。

如需修改代理目标，编辑 `vite.config.ts` 中的 `server.proxy` 配置。

## 注意事项

- antd 版本必须为 5.x（Ant Design X 要求）
- 样式统一使用 SCSS，禁止内联样式
- 新增页面时使用 CSS Modules（`.module.scss`）
