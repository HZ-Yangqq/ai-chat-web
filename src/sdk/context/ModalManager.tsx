/**
 * 命令式弹窗：useModalManager(sendMessage) 返回 { modalElement, openModal }。
 * openModal 返回 Promise，弹窗内组件通过 resolve/reject 决定结果。
 */
import { useCallback, useRef, useState, type ComponentType } from 'react'
import type { ModalContentProps, OpenModalFn, SendMessageFn } from '../core/types'

interface ModalState {
  visible: boolean
  component: ComponentType<ModalContentProps> | null
  props: Record<string, any>
  config: { title?: string; width?: number }
}

const CLOSED_STATE: ModalState = {
  visible: false,
  component: null,
  props: {},
  config: {},
}

export function useModalManager(sendMessage: SendMessageFn) {
  const [modalState, setModalState] = useState<ModalState>(CLOSED_STATE)
  const resolveRef = useRef<((v?: any) => void) | null>(null)
  const rejectRef = useRef<(() => void) | null>(null)

  const openModal = useCallback<OpenModalFn>((component, props = {}, config = {}) => {
    return new Promise((resolve, reject) => {
      resolveRef.current = resolve as (v?: any) => void
      rejectRef.current = reject as () => void
      setModalState({
        visible: true,
        component: component as ComponentType<ModalContentProps>,
        props,
        config,
      })
    })
  }, [])

  const reset = useCallback(() => {
    setModalState(CLOSED_STATE)
    resolveRef.current = null
    rejectRef.current = null
  }, [])

  // 点遮罩关闭
  const handleClose = useCallback(() => {
    rejectRef.current?.()
    reset()
  }, [reset])

  // 组件确认
  const handleResolve = useCallback(
    (v?: any) => {
      resolveRef.current?.(v)
      reset()
    },
    [reset],
  )

  // 组件取消
  const handleReject = useCallback(() => {
    rejectRef.current?.()
    reset()
  }, [reset])

  const { visible, component: Component, props, config } = modalState

  const modalElement =
    visible && Component ? (
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--chat-color-bg,#fff)',
            borderRadius: 'var(--chat-radius-panel,12px)',
            width: config.width || 520,
            maxWidth: '90vw',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: 'var(--chat-shadow-panel,0 6px 16px 0 rgba(0,0,0,0.08))',
          }}
        >
          {config.title ? (
            <div
              style={{
                padding: '16px 24px',
                borderBottom: '1px solid var(--chat-color-border,#e5e7eb)',
                fontWeight: 600,
                color: 'var(--chat-color-text,#1f2937)',
              }}
            >
              {config.title}
            </div>
          ) : null}
          <div style={{ padding: 24 }}>
            <Component
              resolve={handleResolve}
              reject={handleReject}
              sendMessage={sendMessage}
              {...props}
            />
          </div>
        </div>
      </div>
    ) : null

  return { modalElement, openModal }
}
