/**
 * useChat / useCustomEvent / useAboveInput / useSenderHeader
 */
import { useContext, useEffect, useRef, type DependencyList, type ReactNode } from 'react'
import { eventBus } from '../core'
import type { ChatContextValue } from '../core/types'
import { ChatContext } from './ChatProvider'

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext)
  if (!ctx) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return ctx
}

/** 订阅 CUSTOM 事件；handler 变化会重新订阅。 */
export function useCustomEvent(eventName: string, handler: (value: any) => void): void {
  useEffect(() => {
    return eventBus.on(eventName, handler)
  }, [eventName, handler])
}

/** 把节点注册到输入框上方插槽区；node 为 null 或卸载时移除。 */
export function useAboveInput(id: string, node: ReactNode, deps: DependencyList = []): void {
  const { registerAboveInput, unregisterAboveInput } = useChat()
  const idRef = useRef(id)
  idRef.current = id
  useEffect(() => {
    if (node != null) {
      registerAboveInput({ id, node })
    } else {
      unregisterAboveInput(id)
    }
    return () => unregisterAboveInput(idRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, registerAboveInput, unregisterAboveInput, ...deps])
}

/** 把节点注册到 Sender 顶部插槽区；node 为 null 或卸载时移除。 */
export function useSenderHeader(id: string, node: ReactNode, deps: DependencyList = []): void {
  const { registerSenderHeader, unregisterSenderHeader } = useChat()
  const idRef = useRef(id)
  idRef.current = id
  useEffect(() => {
    if (node != null) {
      registerSenderHeader({ id, node })
    } else {
      unregisterSenderHeader(id)
    }
    return () => unregisterSenderHeader(idRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, registerSenderHeader, unregisterSenderHeader, ...deps])
}
