# 05-phase5-history

Phase 5 · 历史会话与统一渲染链路（05）

> 这是**最关键的设计**：历史会话的消息，经过一次转换后，变成与实时流式消息**结构完全一致的** `**Message[]**`，

> 因此复用同一套 `MessageList → MessageBubble → (ThinkBlock/MarkdownRenderer/CardRenderer/CustomInterruptRenderer)` 渲染，无需为历史单独写渲染逻辑。本 Phase 实现这条链路，并补齐用户消息的复制/编辑增强。

依赖前置：Phase 1–4 全部完成。

---

## 1. 核心思想：一套结构，两个来源

```plaintext
实时流式：SSE 事件 → dispatch(START_AI_MESSAGE / APPEND_AI_CONTENT / TOOL_CALL_* / START_THINKING ...) ─┐

                                                                                                       ├─→ 统一的 Message[]（含 contentBlocks/cards/customInterrupts）


历史会话：MESSAGES_SNAPSHOT 事件 → dispatch(MESSAGES_SNAPSHOT) → 把后端快照转换成 Message[] ─────────────┘

                                                                                                       │
                                                                          MessageList → MessageBubble（同一套渲染）

```

**要点**：历史消息与实时消息唯一区别是多一个 `fromHistory: true` 标记，以及卡片/打断默认 `disabled`（只读）。渲染组件不需要判断「是不是历史」，它们只认 `contentBlocks / cards / customInterrupts`。**这就是「历史会话能正常渲染」的根本保证。**

---

## 2. 后端快照数据结构（MESSAGES\_SNAPSHOT 的 event.messages）

`event.messages` 是一个数组，元素形态（后端约定）大致为：

```plaintext
{ role: 'user' | 'assistant' | 'tool' | 'reasoning', id?, content?,
  toolCalls?: [{ id, function: { name, arguments(JSON字符串) } }],
  thinking?,
  pendingInterrupts?: { runId, interrupts: [{ id, reason:'confirmation'|'input_required', message?, toolCallId?, metadata:{type?, uiData?} }] } }

```

*   `role:'reasoning'` 是独立的思考消息，需**合并进它后面第一条 assistant** 的 thinking。
    
*   `role:'tool'` 是工具结果消息，**转换时丢弃**（工具展示靠 assistant 的 toolCalls）。
    
*   `toolCalls` 里每个是一次工具调用，`function.arguments` 是 JSON 字符串，需解析成 cardData。
    
*   `pendingInterrupts` 表示这条历史消息当时挂着未消费的打断，需还原成可交互的打断。
    

---

## 3. Task 5.1 — 实现 `MESSAGES_SNAPSHOT` reducer（替换 Phase 1 的占位）

**目标**：把 `payload.messages`（后端快照）转换成统一 `Message[]`，并还原 `pendingInterrupt`。

**完整逻辑（伪代码）**：

```plaintext

snapshotMessages = action.payload.messages || [ ]


// —— 步骤 1：把 reasoning 合并到「其后第一条 assistant」的 thinking ——
reasoningMap = new Map<assistantId,  string>()
for i in snapshotMessages:
  若 snapshotMessages[i].role === 'reasoning':
    for j from i+1:
      若 snapshotMessages[j].role === 'assistant':
        reasoningMap[snapshotMessages[j].id] = (已有 || '') + (snapshotMessages[i].content || '')
        break

restoredPendingInterrupt = null   // 最终要写入 state.pendingInterrupt

// —— 步骤 2：过滤掉 tool / reasoning，逐条转换 ——
convertedMessages = snapshotMessages
  .filter(m => m.role !== 'tool' && m.role !== 'reasoning')
  .map(msg => {

    // 2a. 用户消息：直接成 complete 用户消息（contentBlocks 空、fromHistory）
    若 msg.role === 'user':

      return { id: msg.id||genId(), role:'user', content: msg.content||'', status:'complete', contentBlocks:[], cards:[], fromHistory:true }


    // 2b. assistant 消息：
    msgId = msg.id || genId()
    thinking = reasoningMap[msg.id] || msg.thinking || ''
    content = msg.content || ''

    toolCalls = msg.toolCalls || [ ]                     // 不按注册表过滤，所有 toolCall 都渲染


    // 收集「打断关联的 toolCallId」——这些工具卡要隐藏（打断接管展示）
    in terruptToolCallIds = new Set()
    若 msg.pendingInterrupts:

      for intr of msg.pendingInterrupts.interrupts||[]: 若 intr.toolCallId → add


    // 所有 toolCall → card（cardComplete/cardDisabled=true 只读；命中打断的 cardHidden=true）
    cards = toolCalls.map(tc => {
      let cardData = {}; try { cardData = JSON.parse(tc.function?.arguments || '{}') } catch {}
      return { toolCallId: tc.id, cardType: tc.function?.name||'', cardData, cardComplete:true, cardDisabled:true, cardHidden: interruptToolCallIds.has(tc.id) }
    })

    // 组装 contentBlocks，顺序：thinking → text → 各 card

    contentBlocks = [ ]

    若 thinking → push { type:'thinking', content:thinking, status:'done' }
    若 content  → push { type:'text', content }
    for tc of toolCalls → push { type:'card', toolCallId: tc.id }

    // 2c. 还原打断
    customInterrupts = undefined
    若 msg.pendingInterrupts:

      rawInterrupts = msg.pendingInterrupts.interrupts || [ ]

      threadId = state.currentThreadId; runId = msg.pendingInterrupts.runId || ''
      // confirmation → 挂到消息 customInterrupts（可交互续跑）
      confirmations = rawInterrupts.filter(reason==='confirmation')
      若 confirmations.length>0:
        customInterrupts = confirmations.map(i=>({ id:i.id, type:i.metadata?.type||'', uiData:i.metadata?.uiData, metadata:i.metadata, message:i.message, toolCallId:i.toolCallId, runId, threadId, disabled:false }))
      // input_required → 设 state.pendingInterrupt（可交互）
      inputRequired = rawInterrupts.filter(reason==='input_required')
      若 inputRequired.length>0:
        restoredPendingInterrupt = { runId, threadId, messageId: msgId, interrupts: inputRequired.map(i=>({ id:i.id, message:i.message, uiData:i.metadata?.uiData||{} })), disabled:false }

    return { id: msgId, role:'assistant', content, thinking, status:'complete', cards, contentBlocks, fromHistory:true, ...(customInterrupts?{customInterrupts}:{}) }
  })

return { ...state, messages: convertedMessages, threadLoading:false, threadLoadError:null, pendingInterrupt: restoredPendingInterrupt }

```
> **注意**：这里 `pendingInterrupt.disabled` 与 customInterrupts 的 `disabled` 都设为 `false`（可交互）—— 因为历史里「未消费的打断」允许用户继续作答续跑。若业务要求纯只读，可改为 `true`。

**验收**：

*   [ ] 传入含 user/assistant/reasoning/tool 混合的快照 → reasoning 并入对应 assistant 的 thinking，tool 被丢弃。
    
*   [ ] assistant 的 toolCalls 变成只读卡片（cardComplete/cardDisabled=true）。
    
*   [ ] contentBlocks 顺序为 thinking→text→cards，与实时结构一致。
    
*   [ ] 带 pendingInterrupts 的历史消息能还原出可交互打断。
    

---

## 4. Task 5.2 — 确认 `switchThread` 逻辑（Phase 1 已实现，此处校验）

回顾 `switchThread(threadId)`（Phase 1 Task 1.9）：

```plaintext
agentRef.abort(); dispatch(CLEAR_PENDING_INTERRUPT)

dispatch(SWITCH_THREAD, {threadId, messages:[]})   // threadLoading=true，清空当前消息


发一次标准 run：input={ threadId, runId, messages:[], context:[], forwardedProps }

callbacks = buildRunCallbacks(...) 但覆写 onRunError → SET_THREAD_LOAD_ERROR
agent.run(input, switchCallbacks)

```

**原理**：对「已存在的 threadId + 空 messages」发起 run，后端识别为「加载历史」，回吐 `MESSAGES_SNAPSHOT`。SDK 复用标准 run 生命周期，因此 isStreaming 等状态自动维护；加载失败走独立的 `threadLoadError`（不污染消息区）。

**外壳的三态展示**（Phase 2 Task 2.11 已实现，校验）：

*   `threadLoading` → 显示 `<Spin/> 会话加载中…`
    
*   `threadLoadError` → 显示错误文案 + 「重试」按钮（点击 `switchThread(currentThreadId)`）
    
*   加载成功（`MESSAGES_SNAPSHOT` 到达）→ messages 填充 → 正常渲染
    

**验收**：

*   [ ] 调 
    
*   [ ] 后端返回错误 → 显示可重试的失败态，不出现「回复失败」气泡。
    
*   [ ] 切换过程中若正在流式，先 abort。
    

---

## 5. Task 5.3 — `components/MessageActionsBubble/`（用户消息增强气泡）

**职责**：默认的「增强气泡」。assistant 消息直接用基础 `MessageBubble`；**用户消息**在「本轮被暂停（lastRunAborted）」时，于最后一条用户消息下追加「复制 / 编辑」操作与「您已暂停」提示；编辑态把气泡替换成输入框。

**Props**：`MessageBubbleProps & { config?: MessageActionsConfig }`。

**依赖**：`antd`（`App, Button, Input`）、`@ant-design/icons`（`CopyOutlined, EditOutlined`）、`useChat()`。

**逻辑**：

```plaintext
const { message: msg } = App.useApp()      // antd 的消息提示（复制成功/失败）
const { state, sendMessage } = useChat()
[editing, setEditing] = useState(false); [draft, setDraft] = useState('')
showCopy = config?.copy !== false; showEdit = config?.edit !== false

// 非用户消息 → 直接基础气泡
若 message.role !== 'user' → return <MessageBubble message={message}/>

// 仅「最后一条用户消息」在暂停态显示操作区
lastUserId = [...state.messages].reverse().find(m=>m.role==='user')?.id
showActions = state.lastRunAborted && message.id === lastUserId

handleCopy(): try navigator.clipboard.writeText(message.content||'') → msg.success('已复制'); catch → msg.error('复制失败')
handleEdit(): setDraft(message.content||''); setEditing(true)
handleSend(): content=draft.trim(); 若空 return; setEditing(false); config?.onEditResend ? onEditResend(content, message) : sendMessage(content)

// 编辑态：整条替换为输入框 + 取消/发送
若 editing:
  <div class=editRow><div class=editBox>
    <Input.TextArea value={draft} autoSize={{minRows:2,maxRows:6}} variant="borderless" onChange=>setDraft>
    <div class=editFooter><Button onClick={()=>setEditing(false)}>取消</Button><Button type=primary disabled={!draft.trim()} onClick={handleSend}>发送</Button></div>
  </div></div>

// 展示态：用户气泡 +（暂停态）操作区 + 提示
<div class=userRow>
  <div class=userBubble>{message.content}</div>
  若 showActions 且 (showCopy||showEdit):
    <div class=actions>{showCopy && <CopyOutlined onClick={handleCopy}/>}{showEdit && <EditOutlined onClick={handleEdit}/>}</div>
    <div class=pausedTip>您已暂停</div>
</div>

```
> `MessageList`（Phase 2 Task 2.6）在未提供覆盖组件、且 `messageActions.enabled!==false` 时使用本组件；否则用基础 `MessageBubble`。此前 MessageList 里对 MessageActionsBubble 的占位现在替换为真实组件。

**样式要点**：`.userRow` 右对齐纵向排列；`.userBubble` 同用户气泡样式；`.actions` 图标行，图标可点、hover 变色；`.pausedTip` 次要文字色小字号；编辑态输入框无边框、浅底圆角。

**验收**：

*   [ ] 正常态用户消息就是普通气泡。
    
*   [ ] 用户点「停止」后，最后一条用户消息出现复制/编辑 + 「您已暂停」。
    
*   [ ] 复制成功有 toast；编辑后发送会重发（或走 onEditResend）。
    

---

## 6. Task 5.4 — 补齐 `components/index.ts` 与 `index.ts` 总出口

`components/index.ts` 增加：`MessageActionsBubble`。确保最终导出全部 15 个组件。

**根** `**index.ts**`**（SDK 总出口）** —— 完整导出：

```ts
export { default as ChatSDK } from './ChatSDK'
// 类型（全部从 core/types 导出，见 Phase 1 Task 1.2 清单）
export type { AgentConfig, AgentCallbacks, /* ...全部类型... */ ContinueRunOptions } from './core/types'
// 常量与工具
export { EVENT_TYPE, MESSAGE_ROLE, MESSAGE_STATUS } from './core/constants'
export type { EventType, MessageRole, MessageStatus } from './core/constants'
export { EventBus, eventBus } from './core/eventBus'
export { createAgent } from './core/agent'
// Context & Hooks
export { ChatProvider } from './context/ChatProvider'
export { useChat, useCustomEvent, useAboveInput, useSenderHeader } from './context/useChat'
// Components（15 个）
export { MessageList, MessageBubble, MessageActionsBubble, MarkdownRenderer, ThinkBlock,
  CardRenderer, GenericInterruptContainer, GenericInterruptSlot, CustomInterruptRenderer,
  UnknownCard, ChatInput, QuickActions, Cursor, AboveInputRegion, ThinkingIndicator } from './components'
// Toolbar（可选 Phase 6）
export { Toolbar, ToolbarAction, CheckboxAction, MenuAction, CheckboxPanel } from './toolbar'

```
> 若暂不做 toolbar（可选模块），删掉最后一行，其余功能完整可用。

---

## 7. Phase 5 总验收（历史会话端到端）

*   [ ] mock：
    
*   [ ] **同一条 assistant 历史消息，思考块可折叠、工具卡显示只读参数、markdown 正常** —— 与实时消息视觉一致（证明统一渲染链路成立）。
    
*   [ ] 历史里未消费的打断 → 输入框上方/气泡内出现可交互打断，作答能续跑。
    
*   [ ] 切到历史后再发新消息，新消息用实时链路，与历史消息在同一列表无缝衔接。
    

---

## 8. 全 SDK 竣工检查清单

*   [ ] 目录结构与 00-overview §3 一致（58 文件，可暂缺 toolbar/）。
    
*   [ ] 
    
*   [ ] 端到端主链路：发消息 → 流式文本 + 思考 + 工具卡 → 结束。
    
*   [ ] 打断：出题 → 作答/取消 → 续跑。
    
*   [ ] 历史：切会话 → 快照转换 → 与实时一致渲染。
    
*   [ ] 停止：普通流式 abort / 打断态 cancelled 续跑。
    
*   [ ] 主题：ThemeConfig → CSS 变量注入生效。
    
*   [ ] 扩展点可用：
    

至此，一个功能等价的 Chat SDK 复刻完成。可选的 `toolbar/`（输入框旁扩展动作按钮）作为增强模块，可参照 `core/types.ts` 里的 `ToolbarActionProps / CheckboxActionProps / MenuActionProps` 类型另行实现，不影响主链路。