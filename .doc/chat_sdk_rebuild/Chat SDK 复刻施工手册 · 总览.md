# Chat SDK 复刻施工手册 · 总览

# Chat SDK 复刻施工手册 · 总览（00）

> 本手册用于指导 AI 助手**从零复刻一个流式对话（Chat）SDK**。全套手册按阶段（Phase）拆分，  每个文件是一批可独立完成、可独立验收的施工任务。**不要一次性喂全部内容给模型**，  请按 `00 → 01 → 02 → 03 → 04 → 05` 顺序逐个 Phase 交付。

---

## 0. 给 AI 助手的元指令（务必先读）

在开始任何一个 Phase 之前，请遵守以下约定：

1. **技术栈固定**：React 18 + TypeScript，UI 依赖 `antd` 与 `@ant-design/x`。不要替换技术栈、不要自作主张引入新库。 2. **一个文件一个任务**：每个 Phase 文档里的每个「任务（Task）」对应一个源码文件。按任务顺序实现，实现完一个再做下一个。 3. **先接口后实现**：先把该文件涉及的类型/Props/函数签名写出来（这些在文档里是精确给定的），再填充实现逻辑。 4. **伪代码是逻辑规格，不是最终代码**：文档中的逻辑用「伪代码 + 中文步骤」描述。你需要把它翻译成符合技术栈的真实 TypeScript/TSX 代码，但**不得改变逻辑分支与数据结构**。 5. **样式用描述还原**：CSS 只给设计意图（布局方式、颜色语义、圆角/间距量级），你据此写 CSS Modules。像素级不必完全一致，但视觉结构要对。 6. **每个任务结束做「验收自检」**：文档给出验收标准（Checklist），逐条确认后再继续。 7. **命名必须与文档一致**：文件名、导出名、类型名、action 常量名、事件名必须逐字一致，否则跨文件引用会断裂。

---

## 1. 这个 SDK 是什么

一个可嵌入的 **AI 流式对话组件**。核心能力：

| 能力 | 说明 |
| --- | --- |
| 流式消息 | 通过 SSE（Server-Sent Events）接收 AI 逐字/逐块输出并实时渲染 |
| 思考过程 | 展示模型「深度思考」（reasoning）内容，可折叠 |
| 工具调用卡片 | 展示 AI 调用工具（tool call）的执行状态与参数 |
| 打断（Interrupt） | AI 运行中可暂停，向用户提问（通用打断）或请求确认（自定义打断），用户作答后续跑 |
| 历史会话 | 切换到历史会话时，把后端消息快照转换成与实时消息**完全相同的结构**，复用同一套渲染 |
| 可扩展 | 卡片、工具、打断组件、主题、布局均可由使用方注入 |

它是一个纯前端 SDK：**不含后端**，只约定了与后端的 SSE 事件协议（见 §5）。

---

## 2. 技术栈与依赖（锁定版本）

```jsonc
// package.json 依赖片段（复刻时请使用这些版本，避免行为差异）
{
  "react": "18.3.1",
  "react-dom": "18.3.1",
  "antd": "~5.29.1",
  "@ant-design/icons": "~5.6.1",
  "@ant-design/x": "^2.0.1",          // 提供 Sender / Think / ThoughtChain / Bubble 等 AI 组件
  "@ant-design/x-markdown": "^2.7.0", // 提供 XMarkdown 渲染
  "classnames": "^2.5.1"
}

```
> `@ant-design/x` 是关键依赖：输入框 `Sender`、思考块 `Think`、`ThoughtChain` 都来自它。  `@ant-design/x-markdown` 的 `XMarkdown` 用于渲染 AI 返回的 markdown 文本。

样式方案：**CSS Modules**（每个组件一个 `index.module.css`）+ 一份全局 CSS 变量文件（主题令牌）。

---

## 3. 目录结构（最终形态）

复刻完成后，`sdk/` 目录应如下（58 个文件，约 5000 行）：

```plaintext
sdk/
├── index.ts                      # 总出口：导出所有公共 API 与类型
├── ChatSDK.tsx                   # 顶层组件（外壳 + 主题注入 + 布局编排）
├── ChatSDK.module.css
├── global.d.ts                   # CSS Modules 类型声明
├── core /                         # 【Phase 1】协议层 & 类型层（无 React 依赖）
│   ├── types.ts                  # 全部 TypeScript 类型（SSOT）
│   ├── constants.ts              # 事件类型 / 角色 / 状态 枚举常量
│   ├── eventBus.ts               # 极简发布订阅
│   ├── agent.ts                  # SSE 请求 & 事件分发（createAgent）
│   └── index.ts
├── state/                        # 【Phase 1】状态机（纯函数 reducer）
│   ├── actions.ts                # action 常量 + ChatAction 联合类型
│   ├── reducer.ts                # initialState + createReducer
│   └── index.ts
├── context/                      # 【Phase 1】编排核心（React Context）
│   ├── ChatProvider.tsx          # 把 agent 事件翻译成 dispatch，暴露 sendMessage 等
│   ├── useChat.ts                # useChat / useCustomEvent / useAboveInput / useSenderHeader
│   ├── ModalManager.tsx          # 命令式弹窗（Promise 化 openModal）
│   └── index.ts
├── components/                   # 【Phase 2-5】渲染组件
│   ├── index.ts
│   ├── MessageList/              # 消息列表（自动滚动）
│   ├── MessageBubble/            # 【核心】消息气泡：按 contentBlocks 分块渲染
│   ├── MessageActionsBubble/     # 增强气泡：用户消息暂停态的复制/编辑
│   ├── MarkdownRenderer/         # markdown 渲染（表格可折叠）
│   ├── ThinkBlock/               # 思考过程块（可折叠）
│   ├── ThinkingIndicator/        # 思考中指示器（简单）
│   ├── Cursor/                   # 流式光标（简单）
│   ├── CardRenderer/             # 工具卡分发器（注册卡 / 通用卡 / 未知卡）
│   ├── ToolRunningCard/          # 【核心】通用工具执行卡（状态 + 参数）
│   ├── UnknownCard/              # 未知卡兜底（简单）
│   ├── GenericInterruptContainer/# 【核心】通用打断容器（多题问答表单）
│   ├── GenericInterruptSlot/     # 把通用打断挂到输入框上方
│   ├── CustomInterruptRenderer/  # 自定义打断分发器
│   ├── ChatInput/                # 输入框（基于 Sender）
│   ├── AboveInputRegion/         # 输入框上方插槽区（含 ErrorBoundary）
│   ├── QuickActions/             # 快捷动作（简单）
│   └── styles/variables.css      # 主题 CSS 变量
└── toolbar/                      # 【可选，最后做】输入框旁的扩展动作按钮
    ├── index.ts
    ├── Toolbar/  ToolbarAction/  CheckboxAction/  CheckboxPanel/  MenuAction/

```
> 带「【核心】」的文件是理解与还原的重点，优先保证正确。  `toolbar/` 是可选扩展，用户可最后再做，不影响主链路。

---

## 4. 分层架构与依赖方向

```plaintext
        ┌─────────────────────────────────────────────┐
        │            ChatSDK.tsx（外壳）               │  ← 组装一切、注入主题/布局
        └───────────────────┬─────────────────────────┘
                            │ 包裹
        ┌───────────────────▼─────────────────────────┐
        │      context/ChatProvider（编排大脑）        │  ← 事件→dispatch，暴露动作
        │  持有 agent 实例 + useReducer(state)         │
        └───────┬───────────────────────┬─────────────┘
                │ 调用                    │ 提供 context
        ┌───────▼────────┐       ┌───────▼─────────────┐
        │ core/agent     │       │ components/*（渲染） │  ← 只读 state + 调 context 动作
        │ (SSE 请求)     │       │ 通过 useChat() 消费  │
        └───────┬────────┘       └─────────────────────┘
                │ 事件回调
        ┌───────▼────────┐
        │ core/eventBus  │       ┌─────────────────────┐
        │ core/types     │       │ state/reducer       │  ← 纯函数，唯一改 state 的地方
        │ core/constants │       │ state/actions       │
        └────────────────┘       └─────────────────────┘

```

**依赖方向铁律**（复刻时不可违反）：

\- `core/` 不依赖任何其他层（无 React）。 - `state/` 只依赖 `core/`（类型 + 常量）。 - `context/` 依赖 `core/` + `state/`。 - `components/` 依赖 `core/`（类型）+ `context/`（`useChat`），**不直接依赖** `**state/reducer**`。 - 组件之间可以互相引用（如 `MessageBubble` 用 `CardRenderer`）。

---

## 5. 后端事件协议（AG-UI 风格 SSE）

后端通过 `POST` 返回 `text/event-stream`。每行形如 `data: {JSON}`，`data: [DONE]` 表示结束。 `agent.ts` 解析每行 JSON，按 `event.type` 分发到回调。事件类型常量（`core/constants.ts`）：

| type 常量 | 含义 | 关键字段 |
| --- | --- | --- |
| `RUN_STARTED` | 一次运行开始 | `runId` |
| `RUN_FINISHED` | 运行结束 | `runId`, `outcome`（可能是 `{type:'interrupt', interrupts:[...]}`） |
| `RUN_ERROR` | 运行出错 | `error` / `message` / `displayMessage` |
| `TEXT_MESSAGE_START` | 文本消息开始 | `messageId` |
| `TEXT_MESSAGE_CONTENT` / `TEXT_MESSAGE_CHUNK` | 文本增量 | `delta`, `messageId` |
| `TEXT_MESSAGE_END` | 文本消息结束 |  |
| `TOOL_CALL_START` | 工具调用开始 | `toolCallId`, `toolCallName`, `messageId`, `displayMessage?` |
| `TOOL_CALL_ARGS` / `TOOL_CALL_CHUNK` | 工具参数增量 | `toolCallId`, `delta`/`args` |
| `TOOL_CALL_END` | 工具调用结束 | `toolCallId`, `displayMessage?` |
| `TOOL_CALL_RESULT` | 工具结果 | `toolCallId`, 结果数据 |
| `REASONING_START` / `REASONING_MESSAGE_START` | 思考开始 | `messageId?` |
| `REASONING_MESSAGE_CONTENT` | 思考增量 | `delta` |
| `REASONING_MESSAGE_END` / `REASONING_END` | 思考结束 |  |
| `MESSAGES_SNAPSHOT` | 消息快照（**历史会话加载靠它**） | `messages: any[]` |
| `CUSTOM` | 自定义事件 | `name`, `value` |
| `STATE_SNAPSHOT` / `STATE_DELTA` | 状态同步（本 SDK 仅预留回调） |  |

**打断（Interrupt）协议**：`RUN_FINISHED` 事件的 `outcome.type === 'interrupt'` 时，`outcome.interrupts` 是打断数组，每个元素含： - `reason`: `'input_required'`（通用打断，SDK 内置 UI）或 `'confirmation'`（自定义打断，使用方注册组件） - `id`, `message?`, `toolCallId?`, `metadata?`（`metadata.type` / `metadata.uiData` 供自定义打断使用）

**续跑（Resume）协议**：用户对打断作答后，再发一次 run，带上 `parentRunId`（原 runId）和 `resume: [{ interruptId, status: 'resolved'|'cancelled', payload? }]`。

---

## 6. 核心数据结构（记住这 3 个，其余在 Phase 1 详列）

### 6.1 Message（一条消息，用户或 AI）

```ts
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string                    // 纯文本累积（兜底）
  status: 'streaming' | 'complete' | 'error'

  contentBlocks: ContentBlock[]      // 【渲染真正依据】有序块列表


  cards: Card[]                      // 工具卡数据（按 toolCallId 索引）

  errorMessage?: string

  customInterrupts?: CustomInterrupt[] // 挂在气泡内的自定义打断

  fromHistory?: boolean              // 是否来自历史快照
  thinking?: string
}

```

### 6.2 ContentBlock（气泡按它顺序渲染 —— 统一渲染的关键）

```ts
type ContentBlock =
  | { type: 'thinking'; content: string; status: 'thinking' | 'done' }
  | { type: 'text'; content: string }
  | { type: 'card'; toolCallId: string }   // 指向 cards 里的某张卡

```
> **核心思想**：一条 AI 消息可能交替产出「思考 / 文本 / 工具卡」。`contentBlocks` 是一个**有序数组**，  记录了它们出现的先后。渲染时 `MessageBubble` 就是遍历 `contentBlocks`，按 `type` 分派到  `ThinkBlock` / `MarkdownRenderer` / `CardRenderer`。**无论是实时流式还是历史快照，最终都被组织成  相同的** `**contentBlocks**`**，所以能走同一套渲染** —— 这就是「统一渲染链路」的本质。

### 6.3 ChatState（全局状态，reducer 管理）

```ts
interface ChatState {
  isLoggedIn: boolean
  userInfo: UserInfo | null
  currentThreadId: string

  threads: Thread[]

  threadLoading: boolean       // 切历史会话加载中
  threadLoadError: string | null

  messages: Message[]          // 【渲染数据源】

  activeRunId: string | null
  lastRunId: string | null
  isStreaming: boolean         // 是否正在流式（输入框显示"停止"）
  lastRunAborted: boolean      // 本轮是否被用户暂停
  error: string | null
  historyPanelVisible: boolean
  pendingInterrupt: PendingInterrupt | null  // 通用打断（输入框上方）
  toolExecutions: Record<string, ToolExecutionState> // 可执行工具的运行状态
}

```
---

## 7. 关键数据流（发一条消息的全过程）

```plaintext
用户在 ChatInput 输入并回车
  → useChat().sendMessage(content)
    → dispatch(ADD_USER_MESSAGE)   // 把用户消息推入 messages，旧卡片置灰
    → dispatch(START_RUN)          // isStreaming=true, 生成 runId
    → agent.run(input, callbacks)  // 发起 SSE 请求
        └── SSE 事件流逐条到达 → agent 解析 → 调用 callbacks：
             onTextMessageStart  → dispatch(START_AI_MESSAGE)   // 新建一条空 assistant 消息
             onThinkingStart     → dispatch(START_THINKING)     // 追加 thinking block
             onThinkingContent   → dispatch(UPDATE_THINKING)    // 累加思考文本
             onThinkingEnd       → dispatch(COMPLETE_THINKING)
             onTextMessageContent→ dispatch(APPEND_AI_CONTENT)  // 累加/新建 text block
             onToolCallStart     → dispatch(TOOL_CALL_START)    // 新建 card + card block
             onToolCallArgs      → dispatch(TOOL_CALL_ARGS)     // 合并卡片参数
             onToolCallEnd       → dispatch(TOOL_CALL_END)      // 卡片标记完成；若注册了工具则执行
             onRunFinished       → 处理 interrupt（若有）→ dispatch(FINISH_RUN)
             onMessagesSnapshot  → dispatch(MESSAGES_SNAPSHOT)  // 历史/最终快照重建 messages
             onRunError          → dispatch(SET_ERROR)
  → 每次 dispatch → reducer 产出新 state → React 重渲染
    → MessageList 遍历 messages → 每条渲染成 MessageBubble
      → MessageBubble 遍历 message.contentBlocks 分块渲染

```

**记住这条链：**`**事件 → callback → dispatch(action) → reducer → 新 state → 组件重渲染**`**。** 所有实时更新都走这条链，没有例外。

---

## 8. 状态机 Action 全表（reducer 分支索引）

| Action | 触发时机 | 对 state 的作用（要点） |
| --- | --- | --- |
| `SET_LOGIN_STATUS` | 初始化/登录/登出 | 设 `isLoggedIn` / `userInfo` |
| `SET_THREADS` | 外部灌入会话列表 | 设 `threads` |
| `NEW_THREAD` | 新建会话 | 换 `currentThreadId`，清空 `messages` |
| `SWITCH_THREAD` | 切历史会话 | 换 thread，清空 messages，`threadLoading=true` |
| `SET_THREAD_LOAD_ERROR` | 历史加载失败 | `threadLoading=false` + 错误文案 |
| `ADD_USER_MESSAGE` | 用户发送 | 推入用户消息；旧卡片/打断置灰禁用 |
| `MESSAGES_SNAPSHOT` | 收到快照 | **把后端消息转成统一 Message\[\] 重建** |
| `START_RUN` | 发起运行 | `isStreaming=true`，记录 runId |
| `START_AI_MESSAGE` | AI 首个输出事件 | 追加空 assistant 消息 |
| `APPEND_AI_CONTENT` | 文本增量 | 累加到最后一个/指定 text block |
| `START/UPDATE/COMPLETE_THINKING` | 思考三段 | 维护 thinking block 内容与状态 |
| `COMPLETE_AI_MESSAGE` | 文本结束 | 末条 assistant 置 complete |
| `SET_ERROR` | 运行错误 | 末条流式消息标 error |
| `FINISH_RUN` | 运行结束 | `isStreaming=false`，收尾未完成 thinking |
| `ABORT_RUN` | 用户暂停 | `isStreaming=false`，`lastRunAborted=true`，禁用卡片 |
| `TOGGLE_HISTORY_PANEL` | 切换历史面板 | 翻转 `historyPanelVisible` |
| `TOOL_CALL_START/ARGS/END` | 工具卡生命周期 | 维护对应 message 的 `cards` + card block |
| `TOOL_EXEC_START/UPDATE/COMPLETE` | 可执行工具运行 | 维护 `toolExecutions[toolCallId]` |
| `SET_PENDING_INTERRUPT` | 通用打断出现 | 设 `pendingInterrupt`，隐藏关联卡片 |
| `CLEAR_PENDING_INTERRUPT` | 打断消费/取消 | 清 `pendingInterrupt` |
| `SET_CUSTOM_INTERRUPTS` | 自定义打断出现 | 挂到指定 message 的 `customInterrupts` |

---

## 9. 施工顺序（Phase 导航）

| Phase | 文档 | 交付内容 | 验收点 |
| --- | --- | --- | --- |
| 1 | `01-phase1-foundation.md` | `core/` + `state/` + `context/` 全部 | 能 `import { ChatProvider, useChat }`，可 mock 一次 run 走通 dispatch |
| 2 | `02-phase2-shell-render.md` | `ChatSDK.tsx` + `MessageList` + `MessageBubble` + `MarkdownRenderer` + `Cursor` + `ChatInput` + `AboveInputRegion` | 能发消息、看到流式文本气泡 + 光标 |
| 3 | `03-phase3-thinking-tools.md` | `ThinkBlock` + `ThinkingIndicator` + `CardRenderer` + `ToolRunningCard` + `UnknownCard` | 思考块可折叠、工具卡显示状态与参数 |
| 4 | `04-phase4-interrupts.md` | `GenericInterruptContainer` + `GenericInterruptSlot` + `CustomInterruptRenderer` + 续跑逻辑 | 打断能出题、作答、提交续跑 |
| 5 | `05-phase5-history.md` | `MESSAGES_SNAPSHOT` 转换 + `switchThread` + `MessageActionsBubble` | 切历史会话，消息与实时一致渲染 |

> Phase 2 起就能跑起来看到东西了；每个 Phase 结束都应是一个「可运行、可验收」的里程碑。

下一步：打开 `01-phase1-foundation.md`。