import { useMemo, useState } from 'react'
import { Button, Checkbox, Input, Radio, Select } from 'antd'
import { UpOutlined, DownOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { useChat } from '../../context'
import type {
  ContinueRunOptions,
  GenericInterrupt,
  GenericQuestion,
  PendingInterrupt,
} from '../../core/types'
import styles from './index.module.css'

export interface GenericInterruptContainerProps {
  pending: PendingInterrupt
  onContinue: (options: ContinueRunOptions) => void
  disabled?: boolean
}

const AUTO_ADVANCE_TYPES = ['radio', 'select']

type PageAnswers = Record<string, any>
type PageTexts = Record<string, string>

/** 计算某题「有效提交值」：选中了 allowInput 的自定义选项 → 取用户输入文本，否则取原值。 */
function getEffectiveValue(question: GenericQuestion, rawValue: any, customText?: string): any {
  const option = question.options?.find((o) => o.value === rawValue)
  if (option?.allowInput) return customText ?? ''
  return rawValue
}

/** 某页（一个 interrupt）所有必填题是否作答完成。 */
function isPageComplete(
  interrupt: GenericInterrupt,
  pageAnswers: PageAnswers,
  pageCustomTexts: PageTexts,
): boolean {
  const questions = interrupt.uiData?.questions || []
  return questions.every((q) => {
    if (!q.required) return true
    const value = getEffectiveValue(q, pageAnswers[q.key], pageCustomTexts[q.key])
    return Array.isArray(value)
      ? value.length > 0
      : value !== undefined && value !== null && value !== ''
  })
}

/** 通用打断容器：把 GenericInterrupt 渲染成问答表单，支持多题型、多页、必填校验、续跑。 */
export default function GenericInterruptContainer({
  pending,
  onContinue,
  disabled,
}: GenericInterruptContainerProps) {
  const { questionComponents } = useChat()

  const interrupts = pending.interrupts || []
  const total = interrupts.length

  const [collapsed, setCollapsed] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, PageAnswers>>({})
  const [customTexts, setCustomTexts] = useState<Record<string, PageTexts>>({})

  const current = interrupts[currentIndex]
  const currentUi = current?.uiData || {}
  const questions = currentUi.questions || []

  const headerTitle = currentUi.title || current?.message || '确认信息'
  const submitText = currentUi.submitText || '确认'
  const dismissText = currentUi.dismissText || '取消'

  const canSubmit = useMemo(
    () =>
      interrupts.every((it) =>
        isPageComplete(it, answers[it.id] || {}, customTexts[it.id] || {}),
      ),
    [interrupts, answers, customTexts],
  )

  const handleSelect = (interruptId: string, question: GenericQuestion, value: any) => {
    const nextPageAnswers = { ...(answers[interruptId] || {}), [question.key]: value }
    setAnswers((prev) => ({ ...prev, [interruptId]: nextPageAnswers }))
    if (
      AUTO_ADVANCE_TYPES.includes(question.type) &&
      current &&
      isPageComplete(current, nextPageAnswers, customTexts[interruptId] || {}) &&
      currentIndex < total - 1
    ) {
      setTimeout(() => setCurrentIndex((idx) => Math.min(idx + 1, total - 1)), 200)
    }
  }

  const handleCustomText = (interruptId: string, question: GenericQuestion, text: string) => {
    setCustomTexts((prev) => ({
      ...prev,
      [interruptId]: { ...(prev[interruptId] || {}), [question.key]: text },
    }))
  }

  const buildPayload = (interrupt: GenericInterrupt): Record<string, any> => {
    const pageAnswers = answers[interrupt.id] || {}
    const pageCustom = customTexts[interrupt.id] || {}
    const payload: Record<string, any> = {}
    interrupt.uiData?.questions?.forEach((q) => {
      payload[q.key] = getEffectiveValue(q, pageAnswers[q.key], pageCustom[q.key])
    })
    return payload
  }

  const handleSubmit = () => {
    if (!canSubmit) return
    onContinue({
      parentRunId: pending.runId,
      resume: interrupts.map((it) => ({
        interruptId: it.id,
        status: 'resolved',
        payload: buildPayload(it),
      })),
    })
  }

  const handleCancel = () => {
    onContinue({
      parentRunId: pending.runId,
      resume: interrupts.map((it) => ({ interruptId: it.id, status: 'cancelled' })),
    })
  }

  const goPrev = () => setCurrentIndex((idx) => Math.max(idx - 1, 0))
  const goNext = () => setCurrentIndex((idx) => Math.min(idx + 1, total - 1))

  const renderOptionLabel = (opt: NonNullable<GenericQuestion['options']>[number]) => (
    <span className={styles['optionLabel']}>
      <span>{opt.label}</span>
      {opt.recommended && <span className={styles['recommendBadge']}>AI推荐</span>}
      {opt.description && <span className={styles['optionDesc']}>{opt.description}</span>}
    </span>
  )

  const renderControl = (question: GenericQuestion) => {
    const selected = answers[current.id]?.[question.key]
    const CustomControl = questionComponents[question.type]
    if (CustomControl) {
      return (
        <CustomControl
          question={question}
          value={selected}
          onChange={(v) => handleSelect(current.id, question, v)}
          disabled={disabled}
          interrupt={current}
        />
      )
    }

    if (question.type === 'input') {
      return (
        <Input
          value={selected}
          placeholder={question.placeholder}
          disabled={disabled}
          onChange={(e) => handleSelect(current.id, question, e.target.value)}
        />
      )
    }

    if (question.type === 'textarea') {
      return (
        <Input.TextArea
          value={selected}
          placeholder={question.placeholder}
          disabled={disabled}
          autoSize={{ minRows: 2, maxRows: 4 }}
          onChange={(e) => handleSelect(current.id, question, e.target.value)}
        />
      )
    }

    if (question.type === 'select') {
      const activeOption = question.options?.find((o) => o.value === selected)
      return (
        <>
          <Select
            style={{ width: '100%' }}
            value={selected}
            placeholder={question.placeholder}
            disabled={disabled}
            options={question.options?.map((o) => ({ value: o.value, label: o.label }))}
            onChange={(v) => handleSelect(current.id, question, v)}
          />
          {activeOption?.allowInput && (
            <Input
              className={styles['customInput']}
              value={customTexts[current.id]?.[question.key]}
              placeholder={activeOption.customPlaceholder || '请输入'}
              disabled={disabled}
              onChange={(e) => handleCustomText(current.id, question, e.target.value)}
            />
          )}
        </>
      )
    }

    if (question.type === 'checkbox') {
      return (
        <Checkbox.Group
          className={styles['optionGroup']}
          value={Array.isArray(selected) ? selected : []}
          disabled={disabled}
          onChange={(v) => handleSelect(current.id, question, v)}
        >
          {question.options?.map((opt) => (
            <Checkbox key={opt.value} value={opt.value} className={styles['optionItem']}>
              {renderOptionLabel(opt)}
            </Checkbox>
          ))}
        </Checkbox.Group>
      )
    }

    // 默认 radio
    const activeOption = question.options?.find((o) => o.value === selected)
    return (
      <>
        <Radio.Group
          className={styles['optionGroup']}
          value={selected}
          disabled={disabled}
          onChange={(e) => handleSelect(current.id, question, e.target.value)}
        >
          {question.options?.map((opt) => (
            <Radio key={opt.value} value={opt.value} className={styles['optionItem']}>
              {renderOptionLabel(opt)}
            </Radio>
          ))}
        </Radio.Group>
        {activeOption?.allowInput && (
          <Input
            className={styles['customInput']}
            value={customTexts[current.id]?.[question.key]}
            placeholder={activeOption.customPlaceholder || '请输入'}
            disabled={disabled}
            onChange={(e) => handleCustomText(current.id, question, e.target.value)}
          />
        )}
      </>
    )
  }

  if (!current) return null

  return (
    <div className={styles['container']}>
      <div className={styles['header']}>
        <span className={styles['headerLeft']}>
          <QuestionCircleOutlined className={styles['headerIcon']} />
          <span className={styles['headerTitle']}>{headerTitle}</span>
        </span>
        <span className={styles['headerRight']}>
          {total > 1 && (
            <span className={styles['pager']}>
              <UpOutlined data-disabled={currentIndex === 0} onClick={goPrev} />
              <span>
                {currentIndex + 1}/{total}
              </span>
              <DownOutlined data-disabled={currentIndex === total - 1} onClick={goNext} />
            </span>
          )}
          <span className={styles['divider']} />
          <span className={styles['toggle']} onClick={() => setCollapsed((v) => !v)}>
            {collapsed ? '展开' : '折叠'}
          </span>
        </span>
      </div>
      {!collapsed && (
        <div className={styles['body']}>
          {questions.length === 0 ? (
            <div className={styles['fallback']}>{current.message || '暂无可确认的内容'}</div>
          ) : (
            questions.map((q) => (
              <div className={styles['question']} key={q.key}>
                <div className={styles['questionTitle']}>
                  {q.title}
                  {q.required && <span className={styles['required']}>*</span>}
                </div>
                {renderControl(q)}
              </div>
            ))
          )}
          <div className={styles['footer']}>
            <Button disabled={disabled} onClick={handleCancel}>
              {dismissText}
            </Button>
            <Button type="primary" disabled={disabled || !canSubmit} onClick={handleSubmit}>
              {submitText}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
