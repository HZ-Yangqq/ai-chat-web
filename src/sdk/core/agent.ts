/**
 * SSE 请求 + 事件分发。
 * createAgent(config) 返回 { run, abort }：run 发起 SSE 请求，逐行解析并按 type 分发到 callbacks。
 */
import { EVENT_TYPE } from './constants'
import type {
  AgentCallbacks,
  AgentConfig,
  AgentInstance,
  AgentRequest,
  RunAgentInput,
} from './types'

/** 解析一行 SSE：`data: {JSON}`，`data: [DONE]` 返回 null。 */
function parseSseLine(line: string): any | null {
  const trimmed = line.trim()
  if (!trimmed.startsWith('data:')) return null
  const data = trimmed.slice('data:'.length).trim()
  if (data === '[DONE]') return null
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}

/** 按 event.type 分发到对应 callback。 */
function dispatchEvent(event: any, callbacks: AgentCallbacks): void {
  switch (event?.type) {
    case EVENT_TYPE.RUN_STARTED:
      callbacks.onRunStarted?.(event)
      break
    case EVENT_TYPE.RUN_FINISHED:
      callbacks.onRunFinished?.(event)
      break
    case EVENT_TYPE.RUN_ERROR:
      callbacks.onRunError?.(event)
      break
    case EVENT_TYPE.TEXT_MESSAGE_START:
      callbacks.onTextMessageStart?.(event)
      break
    case EVENT_TYPE.TEXT_MESSAGE_CONTENT:
    case EVENT_TYPE.TEXT_MESSAGE_CHUNK:
      callbacks.onTextMessageContent?.(event)
      break
    case EVENT_TYPE.TEXT_MESSAGE_END:
      callbacks.onTextMessageEnd?.(event)
      break
    case EVENT_TYPE.TOOL_CALL_START:
      callbacks.onToolCallStart?.(event)
      break
    case EVENT_TYPE.TOOL_CALL_ARGS:
    case EVENT_TYPE.TOOL_CALL_CHUNK:
      callbacks.onToolCallArgs?.(event)
      break
    case EVENT_TYPE.TOOL_CALL_END:
      callbacks.onToolCallEnd?.(event)
      break
    case EVENT_TYPE.TOOL_CALL_RESULT:
      callbacks.onToolCallResult?.(event)
      break
    case EVENT_TYPE.REASONING_START:
    case EVENT_TYPE.REASONING_MESSAGE_START:
      callbacks.onThinkingStart?.(event)
      break
    case EVENT_TYPE.REASONING_MESSAGE_CONTENT:
      callbacks.onThinkingContent?.(event)
      break
    case EVENT_TYPE.REASONING_MESSAGE_END:
    case EVENT_TYPE.REASONING_END:
      callbacks.onThinkingEnd?.(event)
      break
    case EVENT_TYPE.MESSAGES_SNAPSHOT:
      callbacks.onMessagesSnapshot?.(event)
      break
    case EVENT_TYPE.CUSTOM:
      callbacks.onCustom?.(event)
      break
    case EVENT_TYPE.STATE_SNAPSHOT:
      callbacks.onStateSnapshot?.(event)
      break
    case EVENT_TYPE.STATE_DELTA:
      callbacks.onStateDelta?.(event)
      break
    default:
      break
  }
}

/** 真实的 SSE agent（POST + text/event-stream 逐行读取）。 */
function createSseAgent(config: AgentConfig): AgentInstance {
  let abortController: AbortController | null = null

  const run = async (input: RunAgentInput, callbacks: AgentCallbacks): Promise<void> => {
    abortController = new AbortController()

    let forwardedProps: Record<string, any> = {}
    if (config.getForwardedProps) {
      try {
        forwardedProps = (await config.getForwardedProps()) || {}
      } catch {
        // 取值失败忽略
      }
    }

    const body: Record<string, any> = {
      threadId: input.threadId,
      runId: input.runId,
      messages: input.messages,
      context: input.context || [],
      forwardedProps: { ...forwardedProps, ...input.forwardedProps },
    }
    if (input.parentRunId) body.parentRunId = input.parentRunId
    if (input.resume?.length) body.resume = input.resume

    let request: AgentRequest & RequestInit = {
      threadId: input.threadId,
      runId: input.runId,
      parentRunId: input.parentRunId,
      messages: input.messages,
      context: input.context,
      forwardedProps: body.forwardedProps,
      resume: input.resume,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: abortController.signal,
    }

    if (config.requestInterceptor) {
      try {
        const intercepted = await config.requestInterceptor(request)
        request = {
          ...request,
          ...intercepted,
          headers: { ...request.headers, ...(intercepted.headers || {}) },
        }
      } catch {
        // 拦截器失败忽略
      }
    }

    try {
      const response = await fetch(config.url, request as RequestInit)
      if (!response.ok) {
        callbacks.onRunError?.({
          type: EVENT_TYPE.RUN_ERROR,
          message: `HTTP ${response.status}: ${response.statusText}`,
        })
        return
      }
      const reader = response.body?.getReader()
      if (!reader) {
        callbacks.onRunError?.({
          type: EVENT_TYPE.RUN_ERROR,
          message: 'Response body is not readable',
        })
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // 最后一段可能不完整，留到下轮
        for (const line of lines) {
          const event = parseSseLine(line)
          if (event) dispatchEvent(event, callbacks)
        }
      }
      // 收尾：处理残留 buffer
      if (buffer.trim()) {
        const event = parseSseLine(buffer)
        if (event) dispatchEvent(event, callbacks)
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return // 用户主动中断，不报错
      callbacks.onRunError?.({
        type: EVENT_TYPE.RUN_ERROR,
        message: err?.message || 'Unknown error',
      })
    }
  }

  const abort = (): void => {
    abortController?.abort()
    abortController = null
  }

  return { run, abort }
}

/** 工厂：mock 模式直接调用 mock；否则返回真实 SSE agent。 */
export function createAgent(config: AgentConfig): AgentInstance {
  if (config.mock) {
    return {
      run: (input, callbacks) => config.mock!(input, callbacks),
      abort: () => {},
    }
  }
  return createSseAgent(config)
}
