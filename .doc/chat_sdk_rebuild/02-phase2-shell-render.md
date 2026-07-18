# 02-phase2-shell-render

# Phase 2 · 外壳与渲染主链路（02）

> 本 Phase 让 SDK「跑起来看得见」：搭好顶层外壳、消息列表、消息气泡（文本分支）、markdown、光标、输入框。 完成后：输入一句话 → 看到用户气泡 + AI 流式文本气泡（带光标）。 思考块 / 工具卡 / 打断的渲染分支在 MessageBubble 里**预留结构**，Phase 3/4 填充子组件后自动生效。

依赖前置：Phase 1 全部完成。

---

## Task 2.1 — `global.d.ts`（CSS Modules 类型声明）

```ts
declare module '*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}

```
---

## Task 2.2 — `components/styles/variables.css`（主题令牌）

**职责**：定义全局 CSS 变量（主题令牌），组件样式一律引用这些变量，`ChatSDK.tsx` 通过覆盖同名变量实现主题定制。

在 `:root` 下定义以下变量（值为设计基线，可微调）：

```css
:root {
  /* Primary */
  --chat-color-primary: #7c3aed;
  --chat-color-primary-hover: #6d28d9;
  --chat-color-primary-light: #e1d9ff;
  --chat-color-primary-bg: #faf5ff;
  --chat-color-primary-bg-hover: #f5f0ff;
  /* Text */
  --chat-color-text: #1f2937;
  --chat-color-text-secondary: #6b7280;
  --chat-color-text-tertiary: #9ca3af;
  /* Background */
  --chat-color-bg: #ffffff;
  --chat-color-bg-secondary: #f9fafb;
  --chat-color-bg-tertiary: #f3f4f6;
  /* Border */
  --chat-color-border: #e5e7eb;
  --chat-color-border-light: #f0f0f0;
  /* Semantic */
  --chat-color-success: #52c41a;
  --chat-color-error: #ff4d4f;
  --chat-color-warning: #faad14;
  /* Radius */
  --chat-radius-bubble: 12px;
  --chat-radius-card: 8px;
  --chat-radius-toolbar-btn: 16px;
  --chat-radius-panel: 12px;
  /* Font size */
  --chat-font-size-message: 14px;
  --chat-font-size-toolbar: 13px;
  --chat-font-size-small: 12px;
  /* Height */
  --chat-height-toolbar-btn: 28px;
  /* Spacing */
  --chat-padding-container: 20px;
  --chat-gap-message: 16px;
  /* Shadow */
  --chat-shadow-panel: 0 6px 16px 0 rgba(0,0,0,0.08), 0 3px 6px -4px rgba(0,0,0,0.12);
  --chat-shadow-card: 0 1px 2px 0 rgba(0,0,0,0.03), 0 1px 6px -1px rgba(0,0,0,0.02);
  /* Transition */
  --chat-transition-fast: 0.15s ease;
  --chat-transition-normal: 0.25s ease;
}

```
---

## Task 2.3 — `components/Cursor/`（流式光标，简单）

**职责**：一个闪烁的小竖条/方块，表示 AI 正在输出。

**实现**：一个 `<span className={ styles['cursor']} />`。CSS：宽约 2–8px、高约 1em、主色背景、`@keyframes` 让 opacity 在 0/1 间闪烁（约 1s 循环）。

**验收**：单独渲染能看到闪烁光标。

---

## Task 2.4 — `components/MarkdownRenderer/`（markdown 渲染 + 可折叠表格）

**职责**：用 `@ant-design/x-markdown` 的 `XMarkdown` 渲染文本；表格用自定义可折叠组件包裹。Props：`{ content: string }`。

**内部 1 —** `**CollapsibleTable**`（覆盖 markdown 的 `table` 渲染）：

```plaintext
useState expanded=true
外层 div（tableContainer）:
  头部（tableHeader）: 一个眼睛图标 EyeOutlined + 一个按钮，文案「收起表格/展开表格」+ 上/下箭头（UpOutlined/DownOutlined）
  expanded 时渲染 <div tableWrapper><table {...props}>{children}</table></div>

```

**内部 2 —** `**normalizeContent(text)**`（修正 markdown 换行）：

```plaintext
用正则匹配「表格块」（连续的以 | 开头的行）：TABLE_BLOCK_RE = /(?:^[ \t]*\|.+(?:\n|$))+/gm
遍历匹配：
  - 表格块之外的普通文本：把「单个换行」替换成「双换行」（正则 /(?<!
)
(?!
)/g → '

'），保证段落正确分隔
  - 表格块本身：原样保留（不能破坏表格语法）
拼接返回

```
> 目的：AI 输出的单换行在标准 markdown 里不换行，这里补成双换行；但表格内不能动。

**主组件**：

```plaintext
若 !content → return null
textContent = 字符串则 normalizeContent(content)，否则 JSON.stringify(content)
return <div className={styles['markdown']}>< XMarkdown components={{ table: CollapsibleTable }}>{textContent}</XMarkdown></div>

```

**样式要点**：`.markdown` 设置正文字号（用 `--chat-font-size-message`）、行高、段落/列表/代码块间距；表格容器有浅边框和圆角。

**验收**：传入含标题、列表、表格的 markdown 能正确渲染；表格可折叠。

---

## Task 2.5 — `components/MessageBubble/`（消息气泡，核心）

**职责**：渲染单条消息。用户消息=纯文本气泡；AI 消息=遍历 `contentBlocks` 分块渲染。Props 用 `MessageBubbleProps`（本组件只用到 `message`）。

**依赖**：`ThinkBlock`(Phase3)、`CardRenderer`(Phase3)、`CustomInterruptRenderer`(Phase4)、`MarkdownRenderer`(2.4)、`Cursor`(2.3)、`@ant-design/x` 的 `ThoughtChain`。

> Phase 2 阶段 ThinkBlock/CardRenderer/CustomInterruptRenderer 尚未实现：可**先建这三个文件的最简占位组件**（`return null`），Phase 3/4 再替换为真实实现。这样 MessageBubble 结构可一次写全。

**逻辑**：

```plaintext
const { state } = useChat()
isUser = message.role==='user'
isStreaming = message.status==='streaming'
isError = message.status==='error'

// 打断等待提示：本条消息有未处理的自定义打断，或本条触发了通用打断，且已停止流式
hasActiveCustomInterrupt = message.customInterrupts?.some(ci=>!ci.disabled)
isPendingGeneric = state.pendingInterrupt?.messageId===message.id && !state.pendingInterrupt?.disabled
showWaiting = !isUser && !isStreaming && (hasActiveCustomInterrupt || isPendingGeneric)

// 是否显示光标：流式中，且最后一个块「已经有可视内容」时才显示
shouldShowCursor = 计算：
  若 !isStreaming → false

  blocks = message.contentBlocks||[]; 若空 → false

  last = 最后一块
  若 last.type==='thinking' → 返回 last.status==='done'   // 思考结束后、正文前显示光标
  若 last.type==='text' → 返回 last.content 非空
  若 last.type==='card' → 返回 true
  否则 false

```

**渲染结构**：

```plaintext
<div class=messageBubble (+userMessage if isUser)>
  <div class=content (+userContent/aiContent)>
    <div class=bubble (+userBubble/aiBubble)>
      若 isUser:
        <span>{message.content}</span>
      否则:
        若 isError 且 无 content 且 无 errorMessage:
          <span class=errorFallback>服务出错啦～ 请重试！</span>
        否则:
          遍历 message.contentBlocks，按 type 分派：
            thinking 且有 content → <ThinkBlock content status />
            text 且有 content     → <MarkdownRenderer content />
            card 且有 toolCallId   → 从 message.cards 找到该 card；若存在且 !cardHidden → <CardRenderer cardType cardData messageId toolCallId disabled={card.cardDisabled} isStreaming cardComplete={card.cardComplete} />
            其它 → null
          兜底：若 contentBlocks 为空但有 content → <MarkdownRenderer content={message.content} />
        若 showWaiting → <ThoughtChain.Item blink variant="text" title="正在等待用户澄清..." />
        若 message.customInterrupts?.length>0 → <CustomInterruptRenderer interrupts={message.customInterrupts} />
        若 shouldShowCursor → <Cursor />
    </div>
    若 isError → <span class=errorText>{message.errorMessage || '回复生成失败，请重试'}</span>
  </div>
</div>

```

**样式要点**：

*   用户气泡右对齐、主色/浅色背景、圆角 `--chat-radius-bubble`；AI 气泡左对齐、无背景或浅底。
    
*   `content` 用 flex 纵向排列；用户内容靠右，AI 内容靠左。
    
*   `errorText` 用 `--chat-color-error`，小字号。
    

**验收**：用户消息显示为右侧气泡；AI 消息按 blocks 顺序渲染（此阶段主要验证 text 分支 + 光标）。

---

## Task 2.6 — `components/MessageList/`（消息列表 + 自动滚动）

**职责**：遍历 `state.messages` 渲染气泡；新消息自动滚到底，但用户上滑查看历史时不打扰。Props：`{ bubbleComponent?, messageActions? }`。

**逻辑**：

```plaintext
const { state } = useChat(); { messages, isStreaming } = state
listRef = useRef; isAutoScrollRef = useRef(true)
actionsEnabled = messageActions?.enabled !== false

renderBubble(message, isLastMessage):
  若 bubbleComponent（业务覆盖） → <bubbleComponent message isStreaming isLastMessage/>
  否则若 actionsEnabled → <MessageActionsBubble message isStreaming isLastMessage config={messageActions}/>   // MessageActionsBubble 见 Phase 5，此前可先用 MessageBubble 占位
  否则 → <MessageBubble message isStreaming isLastMessage/>

useEffect([messages, isStreaming]): 若 listRef 且 isAutoScrollRef.current → listRef.scrollTop = scrollHeight
handleScroll(): 计算距底距离，(scrollHeight - scrollTop - clientHeight < 100) → isAutoScrollRef.current=true 否则 false

若 messages.length===0 → return null
渲染 <div class=messageList ref onScroll={handleScroll}>{messages.map((m,i)=> <Fragment key={m.id}>{renderBubble(m, i===len-1)}</Fragment>)}</div>

```

**样式要点**：`.messageList` 占满可用高度、`overflow-y:auto`、纵向 flex、消息间距 `--chat-gap-message`、内边距 `--chat-padding-container`。

**验收**：多条消息纵向排列；流式追加时自动贴底；手动上滑后新增内容不强制拉回底部。

---

## Task 2.7 — `components/ChatInput/`（输入框，基于 Sender）

**职责**：底部输入框。回车发送；**本轮任务进行中**（流式生成 或 存在未处理打断）显示「停止」并触发 abortRun；支持顶部插槽（senderHeaderSlots）与自定义 footer。Props：`{ placeholder?, disabled?, footer? }`。

**依赖**：`@ant-design/x` 的 `Sender`、`antd` 的 `Flex`。

**逻辑**：

```plaintext
const { state, sendMessage, abortRun, senderHeaderSlots } = useChat()
{ isStreaming, threadLoading } = state
[value, setValue] = useState('')

// 本轮任务是否仍在进行：流式生成中，或存在未处理打断（通用 pendingInterrupt / 自定义 customInterrupts）
// RUN_FINISHED 带回打断时 isStreaming=false 但任务未结束，发送按钮需保持 loading
inProgress = useMemo(()=>
  isStreaming
  || (state.pendingInterrupt && !state.pendingInterrupt.disabled)
  || state.messages?.some(msg=> msg.customInterrupts?.some(ci=> !ci.disabled))
, [isStreaming, state.pendingInterrupt, state.messages])

headerContent = useMemo：若 senderHeaderSlots.size===0 → undefined
  否则把 slots 按 priority 降序排序，返回一个渲染函数 ()=> <div class=senderHeader>{各 entry.node}</div>

handleSend(content): trimmed=content.trim(); 若空 return; sendMessage(trimmed); setValue('')
handleCancel(): abortRun()

渲染:
<div class=chatInput>
  <Sender
    value onChange={setValue}
    placeholder disabled={disabled || threadLoading} loading={inProgress}
    onSubmit={handleSend} onCancel={handleCancel}
    allowSpeech={false} suffix={false}
    header={headerContent}
    footer={(actionNode)=> <Flex align="center" justify="space-between" class=footerBar><div>{footer}</div>{actionNode}</Flex>}
  />
</div>

```
> `Sender` 的 `loading` 为 true 时内置按钮变为「停止」并触发 `onCancel`。`footer` 回调里的 `actionNode` 是 Sender 自带的发送/停止按钮，把它放右侧。

**验收**：输入回车发送并清空；流式时按钮变「停止」，点它调用 abortRun；**打断态（RUN\_FINISHED 带回未处理打断）按钮保持「停止」态，直到无打断结束才恢复发送**；threadLoading 时禁用。

---

## Task 2.8 — `components/AboveInputRegion/`（输入框上方插槽区）

**职责**：渲染注册到 `aboveInputSlots` 的节点（通用打断容器就挂在这里，见 Phase 4）。带 ErrorBoundary 防止单个插槽崩溃拖垮整体。

**逻辑**：

```plaintext
class SlotErrorBoundary extends Component:  getDerivedStateFromError → {hasError:true}; render 出错时返回 null，否则 children
AboveInputRegion:
  const { aboveInputSlots } = useChat()
  若 size===0 → return null
  sorted = slots 按 priority 降序
  <div class=aboveInputRegion>{ sorted.map(e=> <SlotErrorBoundary key={e.id}>{e.node}</SlotErrorBoundary>) }</div>

```

**验收**：通过 `useAboveInput` 注册的节点出现在此区；某插槽抛错不影响其它。

---

## Task 2.9 — `components/QuickActions/`（快捷动作，简单）

**职责**：欢迎态（无消息时）展示一排快捷入口按钮。Props：`{ actions: QuickAction[] }`。

**逻辑**：渲染一个横向/纵向列表，每项显示 `icon + label`（+可选 description），点击调用 `action.onClick?.(ctx)`。ctx 需含 `sendMessage / openModal / getState / close`（close 可为 noop）——可从 `useChat()` 拼装。

**验收**：传入 actions 显示按钮；点击触发 onClick。

---

## Task 2.10 — `ChatSDK.module.css`

定义外壳样式类：

*   `.chatSdk`：占满高度、纵向 flex（列表区 flex:1 可滚动，输入区固定底部）、背景 `--chat-color-bg`。
    
*   `.threadStatus`：会话加载中/失败态的居中容器（flex 居中、间距、次要文字色）。
    
*   `.threadStatusText`：次要文字。
    
*   `.welcomeArea`：欢迎区容器（居中）。
    

---

## Task 2.11 — `ChatSDK.tsx`（顶层外壳）

**职责**：组装 ChatProvider + 内层 UI；注入主题（把 ThemeConfig 转成 CSS 变量内联 style）；按 layout 编排工具栏/输入框位置；用 `forwardRef` 暴露 `ChatSDKHandle`。

**结构**：分两个组件。

`**ChatSDKInner**`（在 Provider 内，能用 useChat）：

```plaintext
props: { placeholder, welcome, quickActions, children, layout, components, messageActions, senderFooter, innerRef }
const { state, sendMessage, switchThread, createThread } = useChat()
const { modalElement, openModal } = useModalManager(sendMessage)
hasMessages = state.messages.length>0
{ threadLoading, threadLoadError, currentThreadId } = state

useImperativeHandle(innerRef, ()=>({ switchThread, createThread, getThreadId: ()=>currentThreadId }), [switchThread, createThread, currentThreadId])

toolbarPosition = layout?.toolbarPosition ?? 'bottom'
inputPosition = layout?.inputPosition ?? 'bottom'
InputComponent = components?.ChatInput || ChatInput
toolbarEl = (children 且 toolbarPosition!=='hidden') ? <Toolbar>{children}</Toolbar> : null   // Toolbar 见可选 Phase 6，此前可占位为 null
inputEl = <InputComponent placeholder onSend={sendMessage} onCancel={()=>{}} isStreaming={state.isStreaming} disabled={false} footer={senderFooter}/>

渲染 <div class=chatSdk>:
  toolbarPosition==='top' && toolbarEl
  主区（四选一）:
    hasMessages → <MessageList bubbleComponent={components?.MessageBubble} messageActions={messageActions}/>
    否则 threadLoadError → <div class=threadStatus><div class=threadStatusText>{threadLoadError}</div><Button size=small onClick={()=>switchThread(currentThreadId)}>重试</Button></div>
    否则 threadLoading → <div class=threadStatus><Spin/><div class=threadStatusText>会话加载中…</div></div>
    否则 → welcome && <div class=welcomeArea>{welcome}</div>
  quickActions && !hasMessages && !threadLoading && !threadLoadError → <QuickActions actions={quickActions}/>
  toolbarPosition==='bottom' && toolbarEl
  inputPosition==='bottom' && <AboveInputRegion/>
  inputPosition==='bottom' && inputEl
  <GenericInterruptSlot/>    // Phase 4；此前可占位返回 null
  {modalElement}

```

`**ChatSDK**`（`forwardRef<ChatSDKHandle, ChatSDKProps>`）：

```plaintext
解构所有 ChatSDKProps；cards/tools 用稳定 EMPTY 默认值
themeStyle = theme ? 把每个 theme 字段映射成对应 CSS 变量（仅当该字段有值时才写入），as CSSProperties : undefined
  映射表：
    colorPrimary→--chat-color-primary  colorBgContainer→--chat-color-bg  colorBgElevated→--chat-color-bg-secondary
    colorText→--chat-color-text  colorTextSecondary→--chat-color-text-secondary
    colorBorder→--chat-color-border  colorBorderSecondary→--chat-color-border-light
    colorSuccess→--chat-color-success  colorError→--chat-color-error
    borderRadiusBubble→--chat-radius-bubble(px)  borderRadiusCard→--chat-radius-card(px)  borderRadiusToolbarBtn→--chat-radius-toolbar-btn(px)
    fontSizeMessage→--chat-font-size-message(px)  fontSizeToolbar→--chat-font-size-toolbar(px)
    heightToolbarBtn→--chat-height-toolbar-btn(px)  paddingContainer→--chat-padding-container(px)
返回:
<div style={{ height:'100%', ...themeStyle }}>
  <ChatProvider agent authAdapter cards tools interruptComponents questionComponents customEventHandlers onReady onError onMessageSend onRunStart onRunFinish>
    <ChatSDKInner placeholder welcome quickActions layout components messageActions senderFooter innerRef={ref}>{children}</ChatSDKInner>
  </ChatProvider>
</div>
ChatSDK.displayName='ChatSDK'; export default ChatSDK

```
> 顶部 import 处别忘了 `import './components/styles/variables.css'`（引入主题变量）。

**验收**：

*   [ ] 
    
*   [ ] 发消息后出现用户气泡 + 流式 AI 文本气泡 + 光标。
    
*   [ ] 传 
    
*   [ ] 
    

---

## Task 2.12 — `components/index.ts`（补充导出）

导出本 Phase 完成的组件（其余在后续 Phase 补齐）：

```ts
export { default as MessageList } from './MessageList'
export { default as MessageBubble } from './MessageBubble'
export { default as MarkdownRenderer } from './MarkdownRenderer'
export { default as Cursor } from './Cursor'
export { default as ChatInput } from './ChatInput'
export { default as AboveInputRegion } from './AboveInputRegion'
export { default as QuickActions } from './QuickActions'
// 以下在 Phase 3/4/5 完成后加入：
// MessageActionsBubble, ThinkBlock, ThinkingIndicator, CardRenderer, ToolRunningCard,
// UnknownCard, GenericInterruptContainer, GenericInterruptSlot, CustomInterruptRenderer

```
---

## Phase 2 总验收

*   [ ] 端到端 mock：发一句话，AI 逐字回，气泡实时增长，结束后光标消失。
    
*   [ ] 主题变量注入生效。
    
*   [ ] 列表自动滚动 + 上滑不打扰。
    

完成后进入 `03-phase3-thinking-tools.md`。