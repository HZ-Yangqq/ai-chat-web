# 03-phase3-thinking-tools

# Phase 3 · 思考过程与工具执行渲染（03）

> 本 Phase 填充 MessageBubble 里预留的「thinking 块」与「card 块」渲染分支。 完成后：AI 的深度思考过程可折叠展示；工具调用以状态卡片形式展示（执行中/完成/失败 + 参数）。

依赖前置：Phase 1、2 完成（MessageBubble 已按 contentBlocks 分派，ThinkBlock/CardRenderer 为占位）。

---

## 背景：数据从哪来（回顾 Phase 1 的 reducer/callbacks）

*   **思考**：`onThinkingStart → START_THINKING`（追加 `{type:'thinking',content:'',status:'thinking'}` 块）；`onThinkingContent → UPDATE_THINKING`（累加）；`onThinkingEnd → COMPLETE_THINKING`（status→'done'）。MessageBubble 遇到 thinking 块且有 content 时渲染 `<ThinkBlock content status/>`。
    
*   **工具卡**：`onToolCallStart → TOOL_CALL_START`（在消息 cards 里建一张 card + 追加 `{type:'card',toolCallId}` 块）；`onToolCallArgs → TOOL_CALL_ARGS`（合并 cardData）；`onToolCallEnd → TOOL_CALL_END`（cardComplete=true）。MessageBubble 遇到 card 块 → 找到对应 card（未 hidden）→ `<CardRenderer .../>`。
    
*   **可执行工具的运行态**：若使用方注册了 `tools[name]`，`onToolCallEnd` 后会 `executeToolCall` 执行，产生 `state.toolExecutions[toolCallId]`（phase: pending/success/error + statusConfig）。ToolRunningCard 会优先读它来显示状态文案。
    

---

## Task 3.1 — `components/ThinkBlock/`（思考过程块）

**职责**：可折叠展示思考文本。流式中默认展开且标题闪烁，思考完成后自动收起。Props：`{ content: string; status: 'thinking'|'done' }`。

**依赖**：`@ant-design/x` 的 `Think`。

**逻辑**：

```plaintext
complete = status === 'done'
[expanded, setExpanded] = useState(!complete)           // 未完成默认展开
useEffect([complete]): 若 complete → setExpanded(false) // 完成后自动收起
若 !content → return null
渲染:
<Think
  loading={false}
  blink={!complete}                                     // 未完成时标题闪烁
  title={<span class=thinkTitle>{complete ? '思考过程' : '深度思考中'}</span>}
  expanded={expanded}
  onExpand={setExpanded}
  className={styles['thinkBlock']}
  classNames={{ status: styles['statusPill'] }}
>
  {content}
</Think>

```

**样式要点**：`.thinkTitle` 次要文字色、小字号；`.thinkBlock` 内容区用等宽/正文字号、浅底、圆角、内边距；`.statusPill` 为状态小标签样式。

**验收**：流式中标题「深度思考中」并展开、闪烁；结束变「思考过程」并自动收起；点击可再次展开。

---

## Task 3.2 — `components/ThinkingIndicator/`（思考中指示器，简单）

**职责**：一个轻量「AI 思考中…」指示器（点点动画或 loading 图标 + 文案）。用于尚无任何内容时的等待反馈（可选使用）。

**实现**：`<div class=indicator><LoadingOutlined spin/> <span>思考中…</span></div>`，或三个点的 `@keyframes` 跳动动画。无 Props 或仅一个可选 `text`。

**验收**：能显示动态的思考中提示。

---

## Task 3.3 — `components/UnknownCard/`（未知卡兜底，简单）

**职责**：当一个卡片既没注册专用组件、又没有 cardType（toolCallName）时的兜底展示（真正的异常情况）。Props：`UnknownCardProps { cardType: string; cardData: Record<string,any> }`。

**实现**：

```plaintext
<div class=unknownCard>
  <div class=title>未知卡片类型：{cardType || '(空)'}</div>
  <pre class=data>{JSON.stringify(cardData, null, 2)}</pre>
</div>

```

**验收**：传入任意 cardData 能以 JSON 展示，不报错。

---

## Task 3.4 — `components/ToolRunningCard/`（通用工具执行卡，核心）

**职责**：未注册专用卡片的 toolCall 的兜底展示（SDK 内置）。显示：状态图标 + 状态文案 + 可展开的「工具名 + 入参」。Props：`{ toolCallName: string; cardComplete: boolean; toolCallId?: string; cardData?: Record<string,any> }`。

**依赖**：`@ant-design/icons`（`CheckCircleOutlined / CloseCircleOutlined / DownOutlined / LoadingOutlined`）、`classnames`。

**状态来源优先级（关键逻辑）**：

```plaintext
const { state } = useChat()
[expanded, setExpanded] = useState(false)
exec = toolCal lId ? state.toolExecutions[toolCallId] : undefined
statusConfig = exec?.statusConfig

// 完成/失败判定：
//   已注册工具（有 exec）→ 看 phase（success/error）
//   普通 toolCall（无 exec）→ 看 cardComplete
isError = exec?.phase === 'error'
isDone  = exec ? (exec.phase==='success' || exec.phase==='error') : cardComplete

// 文案优先级：statusConfig 文案 > cardData 辅助文案 > 默认文案
label =
  isError ? (statusConfig?.error || '执行失败')
  : isDone ? (statusConfig?.success || cardData?.endDisplayMessage || '执行完成')
  : (statusConfig?.pending || cardData?.displayMessage || '执行中...')

// 入参 = cardData 去掉内部辅助字段（displayMessage / endDisplayMessage）
params = Object.fromEntries(Object.entries(cardData||{}).filter(([k])=> k!=='displayMessage' && k!=='endDisplayMessage'))
hasParams = Object.keys(params).length > 0

```

**渲染结构**：

```plaintext
<div class=card>
  <div class=header onClick={()=>setExpanded(v=>!v)}>
    图标：isError → <CloseCircleOutlined class=errorIcon/>
          否则 isDone → <CheckCircleOutlined class=successIcon/>
          否则 → <LoadingOutlined class=loadingIcon spin/>
    <span class=label>{label}</span>
    <DownOutlined class={classnames(styles.arrow, {arrowOpen: expanded})}/>
  </div>
  若 expanded:
    <div class=body>
      <div class=toolName>{toolCallName}</div>
      若 hasParams → <pre class=paramsBox>{JSON.stringify(params, null, 2)}</pre>
    </div>
</div>

```

**样式要点**：卡片浅底、圆角 `--chat-radius-card`、`--chat-shadow-card`；header 可点击（cursor pointer）横向排列；successIcon 用 `--chat-color-success`、errorIcon 用 `--chat-color-error`、loadingIcon 用主色；arrow 展开时旋转 180deg（transition）；paramsBox 等宽字体、浅底、可横向滚动。

**验收**：

*   [ ] 流式中显示 loading 图标 + 「执行中...」（或 displayMessage）。
    
*   [ ] cardComplete 后显示对勾 + 「执行完成」（或 endDisplayMessage）。
    
*   [ ] 有对应 toolExecutions.error 时显示红叉 + 失败文案。
    
*   [ ] 点击展开显示工具名和参数 JSON。
    

---

## Task 3.5 — `components/CardRenderer/`（工具卡分发器）

**职责**：根据 cardType 把工具卡分派到「使用方注册的专用卡片」/「SDK 内置通用工具卡」/「未知卡」。这是卡片扩展点。

**Props**：`{ cardType, cardData, messageId, toolCallId, disabled, isStreaming, cardComplete }`。

**逻辑**：

```plaintext
const { cardRegistry, sendMessage } = useChat()
CardComponent = cardRegistry[cardType]
若 !CardComponent:
  若 cardType（有 toolCallName） → <ToolRunningCard toolCallName={cardType} cardComplete toolCallId cardData/>   // 内置通用卡
  否则 → <UnknownCard cardType cardData/>                                                                        // 真异常
否则:
  props: CardProps = { cardType, toolCallId, messageId, cardData, cardComplete, disabled, isStreaming, sendMessage }
  <CardComponent {...props}/>

```

**验收**：

*   [ ] 未注册 cardType 时走 ToolRunningCard。
    
*   [ ] 注册了 
    
*   [ ] cardType 为空时走 UnknownCard。
    

---

## Task 3.6 — 更新 MessageBubble 与 components/index.ts

*   把 Phase 2 里 ThinkBlock / CardRenderer 的占位替换为真实 import（MessageBubble 的分派逻辑无需改动，Phase 2 已写全）。
    
*   在 `components/index.ts` 增加导出：`ThinkBlock, ThinkingIndicator, CardRenderer, ToolRunningCard, UnknownCard`。
    

---

## Phase 3 总验收（用 mock 制造思考 + 工具事件）

*   [ ] mock 依次触发 thinking 三段事件：气泡内出现可折叠思考块，结束自动收起。
    
*   [ ] mock 触发 toolCallStart/Args/End：气泡内出现工具卡，参数随 args 累积，结束显示完成态。
    
*   [ ] 思考块与工具卡按事件到达顺序，正确穿插在文本块之间（验证 contentBlocks 的有序性）。
    

完成后进入 `04-phase4-interrupts.md`。