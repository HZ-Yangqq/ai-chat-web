/**
 * 本地 mock agent：在没有真实 SSE 后端时，模拟 AG-UI 协议的流式文本事件，
 * 让 ChatSDK 在本地即可开箱演示。配置了 VITE_CHAT_AGENT_URL 后会走真实后端。
 */
import { EVENT_TYPE } from '@/sdk'
import type { MockAgentFn } from '@/sdk'

export const mockAgentFn: MockAgentFn = (input, callbacks) => {
  const lastUser = [...input.messages].reverse().find((m) => m.role === 'user')
  const question = lastUser?.content ?? ''
  const reply = `收到你的消息：“${question}”。这是 SDK 接入后的模拟流式回复，用于本地演示。`

  let cancelled = false
  const timers: ReturnType<typeof setTimeout>[] = []
  const schedule = (fn: () => void, delay: number) => {
    const t = setTimeout(() => {
      if (!cancelled) fn()
    }, delay)
    timers.push(t)
  }

  const messageId = `mock-msg-${Date.now()}`

  callbacks.onRunStarted?.({ type: EVENT_TYPE.RUN_STARTED, runId: input.runId })
  callbacks.onTextMessageStart?.({ type: EVENT_TYPE.TEXT_MESSAGE_START, messageId })

  const chars = Array.from(reply)
  chars.forEach((ch, i) => {
    schedule(() => {
      callbacks.onTextMessageContent?.({
        type: EVENT_TYPE.TEXT_MESSAGE_CONTENT,
        messageId,
        delta: ch,
      })
    }, 30 * (i + 1))
  })

  schedule(() => {
    callbacks.onTextMessageEnd?.({ type: EVENT_TYPE.TEXT_MESSAGE_END, messageId })
    callbacks.onRunFinished?.({ type: EVENT_TYPE.RUN_FINISHED, runId: input.runId })
  }, 30 * (chars.length + 1))

  return {
    abort: () => {
      cancelled = true
      timers.forEach(clearTimeout)
    },
  }
}
