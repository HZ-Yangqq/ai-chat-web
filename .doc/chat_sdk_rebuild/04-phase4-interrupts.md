# 04-phase4-interrupts

# Phase 4 · 打断机制：通用打断 + 自定义打断（04）

> 「打断（Interrupt）」= AI 运行中暂停，向用户索取信息，用户作答后续跑（resume）。 分两类：完成后：AI 能出问答卡，用户作答/取消 → 续跑；也能触发使用方自定义确认组件。

依赖前置：Phase 1（`SET_PENDING_INTERRUPT / SET_CUSTOM_INTERRUPTS / continueRun / abortRun` 已实现）、Phase 2（AboveInputRegion / useAboveInput）、Phase 3。

---

## 背景：打断的数据流（回顾）

1.  后端在 `RUN_FINISHED` 事件返回 `outcome: { type:'interrupt', interrupts:[...] }`。
    
2.  `ChatProvider.onRunFinished` 按 `reason` 分流（Phase 1 已实现）：
    
    *   `input_required` → `dispatch(SET_PENDING_INTERRUPT)` → 写 `state.pendingInterrupt`，并隐藏关联工具卡。
        
    *   `confirmation` → `dispatch(SET_CUSTOM_INTERRUPTS)` → 挂到对应 message 的 `customInterrupts`。
        
3.  渲染：
    
    *   `state.pendingInterrupt` → `GenericInterruptSlot` 把 `GenericInterruptContainer` 注册到输入框上方。
        
    *   `message.customInterrupts` → `MessageBubble` 内渲染 `CustomInterruptRenderer`。
        
4.  用户作答 → 调 `continueRun({ parentRunId, resume:[{interruptId, status, payload}] })` 续跑；取消 → `status:'cancelled'`。
    

---

## Task 4.1 — `components/GenericInterruptContainer/`（通用打断容器，核心）

**职责**：把一个或多个 `GenericInterrupt`（每个含若干 `GenericQuestion`）渲染成问答表单。支持多种题型、多个打断分页作答、必填校验、自定义输入、提交/取消续跑、折叠、只读（历史还原）。

**Props**：`{ pending: PendingInterrupt; onContinue: (options: ContinueRunOptions)=>void; disabled?: boolean }`。

**依赖**：`antd`（`Button, Checkbox, Input, Radio, Select`）、`@ant-design/icons`（`UpOutlined, DownOutlined`）、`useChat()`（取 `questionComponents`）。

**常量与工具函数**：

```plaintext
AUTO_ADVANCE_TYPES = ['radio','select']   // 这些题型作答后自动翻到下一页

// 计算某题「有效提交值」：选中了 allowInput 的自定义选项 → 取用户输入文本，否则取原值
getEffectiveValue(question, rawValue, customText):
  option = question.options?.find(o=>o.value===rawValue)
  若 option?.allowInput → 返回 customText ?? ''
  否则 → 返回 rawValue

// 某页（一个 interrupt）所有必填题是否作答完成
isPageComplete(interrupt, pageAnswers, pageCustomTexts):

  questions = interrupt.uiData?.questions || [ ]

  return questions.every(q =>
    !q.required ? true :
     (value = getEffectiveValue(q, pageAnswers[q.key], pageCustomTexts[q.key]),
     Array.isArray(value) ? value.length>0 : (value!==undefined && value!==null && value!=='')))

```

**状态**：

```plaintext
const { questionComponents } = useChat()

interrupts = pending.interrupts || []; total = interrupts.length

[collapsed, setCollapsed] = useState(false)
[currentIndex, setCurrentIndex] = useState(0)                  // 当前第几页（哪个 interrupt）
[answers, setAnswers] = useState({})                           // answers[interrupt.id][question.key] = 选中值
[customTexts, setCustomTexts] = useState({})                   // customTexts[interrupt.id][question.key] = 自定义输入文本
current = interrupts[currentIndex]; currentUi = current?.uiData || {}

questions = currentUi.questions || [ ]

headerTitle = currentUi.title || current?.message || '确认信息'
submitText = currentUi.submitText || '确认'
dismissText = currentUi.dismissText || '取消'
// 可提交 = 所有页都完成（跨页校验）
canSubmit = useMemo(()=> interrupts.every(it=> isPageComplete(it, answers [it.id]||{}, customTexts[it.id]||{})), [interrupts, answers, customTexts])

```

**事件处理**：

```plaintext
handleSelect(interruptId, question, value):
  nextPageAnswers = { ...(answers[interruptId]||{}), [question.key]: value }
  setAnswers(prev=> ({...prev, [interruptId]: nextPageAnswers}))
  // 单选类作答完成且非最后一页 → 200ms 后自动翻页
  若 AUTO_ADVANCE_TYPES.includes(question.type) 且 current 且 isPageComplete(current, nextPageAnswers, customTexts[interruptId]||{}) 且 currentIndex<total-1:
    setTimeout(()=> setCurrentIndex(idx=> min(idx+1, total-1)), 200)

handleCustomText(interruptId, question, text):
  setCustomTexts(prev=> ({...prev, [interruptId]: {...(prev[interruptId]||{}), [question.key]: text}}))   // 不触发自动翻页

buildPayload(interrupt):  // 组装该页提交值
  pageAnswers=answers[interrupt.id]||{}; pageCustom=customTexts[interrupt.id]||{}
  payload={}; interrupt.uiData?.questions?.forEach(q=> payload[q.key]=getEffectiveValue(q, pageAnswers[q.key], pageCustom[q.key]))
  return payload

handleSubmit(): 若 !canSubmit return; onContinue({ parentRunId: pending.runId, resume: interrupts.map(it=>({interruptId: it.id, status:'resolved', payload: buildPayload(it)})) })
handleCancel(): onContinue({ parentRunId: pending.runId, resume: interrupts.map(it=>({interruptId: it.id, status:'cancelled'})) })
goPrev(): setCurrentIndex(idx=> max(idx-1,0));  goNext(): setCurrentIndex(idx=> min(idx+1, total-1))

```

**题型控件渲染** `**renderControl(question)**`（按 `question.type` 分派，值统一通过 `handleSelect` 回流）：

```plaintext
selected = answers[current.id]?.[question.key]
// 0. 优先外部注册的自定义题型组件
CustomControl = questionComponents[question.type]
若 CustomControl → <CustomControl question value={selected} onChange={v=>handleSelect(current.id,question,v)} disabled interrupt={current}/>

// 1. input → <Input value placeholder onChange=>handleSelect(...e.target.value)>
// 2. textarea → <Input.TextArea autoSize={{minRows:2,maxRows:4}} ...>
// 3. select →
//    <Select value placeholder options={question.options映射为{value,label}} onChange=>handleSelect>
//    若选中项 allowInput → 额外渲染 <Input value={customTexts[current.id]?.[key]} placeholder={activeOption.customPlaceholder||'请输入'} onChange=>handleCustomText>
// 4. checkbox →

//    <Checkbox.Group value={Array.isArray(selected)?selected:[]} onChange=>handleSelect>

//      每个 option 一个 <Checkbox value={opt.value}>：label + （opt.recommended→「AI推荐」徽标）+ （opt.description→描述）
// 5. 默认（radio）→
//    <Radio.Group value onChange=>handleSelect(...e.target.value)>：同 checkbox 的 label/推荐/描述结构
//    若选中项 allowInput → 额外自定义输入框（同 select）

```

**渲染结构**：

```plaintext
若 !current → return null
<div class=container>
  <div class=header>
    左：<img class=headerIcon .../> <span class=headerTitle>{headerTitle}</span>
    右：
      若 total>1 → <div class=pager><UpOutlined data-disabled={currentIndex===0} onClick={goPrev}/> <span>{currentIndex+1}/{total}</span> <DownOutlined data-disabled={currentIndex===total-1} onClick={goNext}/></div>
      <span class=divider/>
      <span class=toggle onClick={()=>setCollapsed(v=>!v)}>{collapsed?'展开':'折叠'}</span>
  </div>
  若 !collapsed:
    <div class=body>
      若 questions.length===0 → <div class=fallback>{current.message || '暂无可确认的内容'}</div>
      否则 questions.map(q=> <div class=question key={q.key}><div class=questionTitle>{q.title}{q.required && <span class=required>*</span>}</div>{renderControl(q)}</div>)
      <div class=footer>
        <Button disabled={disabled} onClick={handleCancel}>{dismissText}</Button>
        <Button type=primary disabled={disabled || !canSubmit} onClick={handleSubmit}>{submitText}</Button>
      </div>
    </div>
</div>

```

**样式要点**：容器有边框/圆角 `--chat-radius-panel`、浅底、`--chat-shadow-panel`；header 两端对齐；pager 箭头 `data-disabled` 时降透明度且禁点；option 项纵向排列，推荐徽标用主色浅底小标签，描述用次要文字色小字号；footer 按钮右对齐、间距。

**验收**：

*   [ ] 单选题作答后 200ms 自动翻到下一题（多页时）。
    
*   [ ] 必填未完成时「确认」禁用；全部完成才可提交。
    
*   [ ] 「其他/自定义」选项（allowInput）选中后出现输入框，提交时该题取输入文本。
    
*   [ ] checkbox 多选、select、input、textarea 均可作答。
    
*   [ ] 提交 → onContinue(resolved + payload)；取消 → onContinue(cancelled)。
    
*   [ ] 
    

---

## Task 4.2 — `components/GenericInterruptSlot/`（挂载通用打断）

**职责**：把 `GenericInterruptContainer` 注册到输入框上方插槽。本身不渲染内容。

**逻辑**：

```plaintext
const SLOT_ID = '__sdk_generic_interrupt__'
const { state, continueRun } = useChat()
pending = state.pendingInterrupt
node = pending ? <GenericInterruptContainer key={pending.runId} pending={pending} onContinue={continueRun} disabled={pending.disabled}/> : null
useAboveInput(SLOT_ID, node, [pending, continueRun])
return null

```
> 记得在 `ChatSDK.tsx` 里渲染 `<GenericInterruptSlot/>`（Phase 2 已预留占位，此处替换为真实组件）。

**验收**：`state.pendingInterrupt` 存在时，输入框上方出现问答容器；作答续跑后消失。

---

## Task 4.3 — `components/CustomInterruptRenderer/`（自定义打断分发器）

**职责**：渲染一条消息里的 `customInterrupts`，按 `type` 路由到使用方注册的组件（`interruptComponents[type]`）。SDK 只提供空白容器，样式与续跑逻辑由注册组件自理。

**Props**：`{ interrupts: CustomInterrupt[] }`。

**逻辑**：

```plaintext
const { interruptComponents, continueRun, sendMessage } = useChat()
若 !interrupts?.length → return null
interrupts.map(item=>{
  Component = interruptComponents[item.type]
  若 !Component → <div key={item.id} class=fallback>{item.message || `未注册的自定义打断组件：${item.type}`}</div>
  否则 → <div key={item.id} class=slot>
    <Component
      interrupt={{ id:item.id, type:item.type, uiData:item.uiData, metadata:item.metadata, message:item.message, toolCallId:item.toolCallId, runId:item.runId, threadId:item.threadId }}
      disabled={!!item.disabled}
      continueRun={continueRun}
      sendMessage={sendMessage}
    />
  </div>
})

```
> 注册组件（使用方实现）通过 `continueRun` 续跑，典型：`continueRun({ parentRunId: interrupt.runId, resume:[{interruptId: interrupt.id, status:'resolved', payload:{...}}] })`；`metadata` 里可能带 `actionHash` 等需回传的信息。

**验收**：

*   [ ] 注册了 
    
*   [ ] 未注册 → 显示兜底文案。
    
*   [ ] 
    

---

## Task 4.4 — 打断关联工具卡的隐藏（已在 reducer 内置，确认即可）

打断常常关联某个 toolCall（`interrupt.toolCallId`）。为避免「工具卡」和「打断卡」重复展示，reducer 在 `SET_PENDING_INTERRUPT`/`SET_CUSTOM_INTERRUPTS` 时会把关联 toolCallId 的 card 置 `cardHidden:true`（Phase 1 已实现）；MessageBubble 渲染 card 块时跳过 `cardHidden` 的卡（Phase 2 已实现）。**本 Phase 无需额外代码，验证联动即可。**

**验收**：带 toolCallId 的打断出现时，对应工具卡消失，由打断组件接管展示。

---

## Task 4.5 — 更新 components/index.ts

增加导出：`GenericInterruptContainer, GenericInterruptSlot, CustomInterruptRenderer`。

---

## Phase 4 总验收（mock 制造打断）

*   [ ] mock 在 
    
*   [ ] 作答并提交 → 触发一次续跑（带 parentRunId + resume resolved）。
    
*   [ ] 点「取消」→ 续跑 cancelled。
    
*   [ ] 流式中点「停止」（此时是打断态）→ abortRun 发 cancelled 续跑（Phase 1 逻辑）。
    
*   [ ] confirmation 类打断 + 注册组件 → 气泡内渲染自定义组件。
    

完成后进入 `05-phase5-history.md`（历史会话统一渲染，最后一块拼图）。