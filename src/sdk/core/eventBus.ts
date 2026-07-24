/**
 * 极简发布订阅，用于 CUSTOM 事件的跨组件广播。
 */

type Handler = (payload?: any) => void

export class EventBus {
  private listeners = new Map<string, Set<Handler>>()

  /** 订阅事件，返回取消订阅函数。 */
  on(event: string, handler: Handler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler)
    return () => this.off(event, handler)
  }

  off(event: string, handler: Handler): void {
    this.listeners.get(event)?.delete(handler)
  }

  /** 触发事件；单个 handler 抛错不影响其它 handler。 */
  emit(event: string, payload?: any): void {
    const handlers = this.listeners.get(event)
    if (!handlers) return
    handlers.forEach((handler) => {
      try {
        handler(payload)
      } catch (err) {
        console.error(`[eventBus] handler error for "${event}":`, err)
      }
    })
  }

  clear(): void {
    this.listeners.clear()
  }
}

export const eventBus = new EventBus()
