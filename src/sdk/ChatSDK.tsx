/**
 * 顶层外壳：组装 ChatProvider + 内层 UI；注入主题（ThemeConfig → CSS 变量）；
 * 按 layout 编排工具栏/输入框位置；用 forwardRef 暴露 ChatSDKHandle。
 */
import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  type CSSProperties,
  type ComponentType,
  type Ref,
} from 'react'
import { Button, Spin } from 'antd'
import { ChatProvider, useChat } from './context'
import { MessageList, ChatInput, AboveInputRegion, QuickActions } from './components'
import GenericInterruptSlot from './components/GenericInterruptSlot'
import type {
  ChatSDKProps,
  ChatSDKHandle,
  ChatInputProps,
  CardRegistry,
  ToolRegistry,
  ThemeConfig,
} from './core/types'
import styles from './ChatSDK.module.css'
import './components/styles/variables.css'

const EMPTY_CARDS: CardRegistry = {}
const EMPTY_TOOLS: ToolRegistry = {}

interface ChatSDKInnerProps {
  placeholder?: ChatSDKProps['placeholder']
  welcome?: ChatSDKProps['welcome']
  quickActions?: ChatSDKProps['quickActions']
  children?: ChatSDKProps['children']
  layout?: ChatSDKProps['layout']
  components?: ChatSDKProps['components']
  messageActions?: ChatSDKProps['messageActions']
  senderFooter?: ChatSDKProps['senderFooter']
  innerRef?: Ref<ChatSDKHandle>
}

function ChatSDKInner(props: ChatSDKInnerProps) {
  const {
    placeholder,
    welcome,
    quickActions,
    children,
    layout,
    components,
    messageActions,
    senderFooter,
    innerRef,
  } = props
  const { state, sendMessage, switchThread, createThread } = useChat()
  const hasMessages = state.messages.length > 0
  const { threadLoading, threadLoadError, currentThreadId } = state

  useImperativeHandle(
    innerRef,
    () => ({ switchThread, createThread, getThreadId: () => currentThreadId }),
    [switchThread, createThread, currentThreadId],
  )

  const toolbarPosition = layout?.toolbarPosition ?? 'bottom'
  const inputPosition = layout?.inputPosition ?? 'bottom'
  const InputComponent: ComponentType<ChatInputProps> = components?.ChatInput || ChatInput
  // Toolbar 见可选 Phase 6，此前占位为 null。
  const toolbarEl = null
  void children
  void toolbarPosition

  const inputEl = (
    <InputComponent
      placeholder={placeholder}
      onSend={sendMessage}
      onCancel={() => {}}
      isStreaming={state.isStreaming}
      disabled={false}
      footer={senderFooter}
    />
  )

  return (
    <div className={styles['chatSdk']}>
      {toolbarPosition === 'top' && toolbarEl}
      {hasMessages ? (
        <MessageList bubbleComponent={components?.MessageBubble} messageActions={messageActions} />
      ) : threadLoadError ? (
        <div className={styles['threadStatus']}>
          <div className={styles['threadStatusText']}>{threadLoadError}</div>
          <Button size="small" onClick={() => switchThread(currentThreadId)}>
            重试
          </Button>
        </div>
      ) : threadLoading ? (
        <div className={styles['threadStatus']}>
          <Spin />
          <div className={styles['threadStatusText']}>会话加载中…</div>
        </div>
      ) : (
        welcome && <div className={styles['welcomeArea']}>{welcome}</div>
      )}
      {quickActions && !hasMessages && !threadLoading && !threadLoadError && (
        <QuickActions actions={quickActions} />
      )}
      {toolbarPosition === 'bottom' && toolbarEl}
      {inputPosition === 'bottom' && <AboveInputRegion />}
      {inputPosition === 'bottom' && inputEl}
      <GenericInterruptSlot />
    </div>
  )
}

const ChatSDK = forwardRef<ChatSDKHandle, ChatSDKProps>(function ChatSDK(props, ref) {
  const {
    agent,
    authAdapter,
    components,
    messageActions,
    theme,
    layout,
    cards = EMPTY_CARDS,
    tools = EMPTY_TOOLS,
    interruptComponents,
    questionComponents,
    customEventHandlers,
    children,
    placeholder,
    welcome,
    quickActions,
    senderFooter,
    onReady,
    onError,
    onMessageSend,
    onRunStart,
    onRunFinish,
  } = props

  const themeStyle = useMemo<CSSProperties | undefined>(() => {
    if (!theme) return undefined
    const s: Record<string, string> = {}
    const set = (key: keyof ThemeConfig, cssVar: string, unit = '') => {
      const v = theme[key]
      if (v != null) s[cssVar] = `${v}${unit}`
    }
    set('colorPrimary', '--chat-color-primary')
    set('colorBgContainer', '--chat-color-bg')
    set('colorBgElevated', '--chat-color-bg-secondary')
    set('colorText', '--chat-color-text')
    set('colorTextSecondary', '--chat-color-text-secondary')
    set('colorBorder', '--chat-color-border')
    set('colorBorderSecondary', '--chat-color-border-light')
    set('colorSuccess', '--chat-color-success')
    set('colorError', '--chat-color-error')
    set('borderRadiusBubble', '--chat-radius-bubble', 'px')
    set('borderRadiusCard', '--chat-radius-card', 'px')
    set('borderRadiusToolbarBtn', '--chat-radius-toolbar-btn', 'px')
    set('fontSizeMessage', '--chat-font-size-message', 'px')
    set('fontSizeToolbar', '--chat-font-size-toolbar', 'px')
    set('heightToolbarBtn', '--chat-height-toolbar-btn', 'px')
    set('paddingContainer', '--chat-padding-container', 'px')
    return s as CSSProperties
  }, [theme])

  return (
    <div style={{ height: '100%', ...themeStyle }}>
      <ChatProvider
        agent={agent}
        authAdapter={authAdapter}
        cards={cards}
        tools={tools}
        interruptComponents={interruptComponents}
        questionComponents={questionComponents}
        customEventHandlers={customEventHandlers}
        onReady={onReady}
        onError={onError}
        onMessageSend={onMessageSend}
        onRunStart={onRunStart}
        onRunFinish={onRunFinish}
      >
        <ChatSDKInner
          placeholder={placeholder}
          welcome={welcome}
          quickActions={quickActions}
          layout={layout}
          components={components}
          messageActions={messageActions}
          senderFooter={senderFooter}
          innerRef={ref}
        >
          {children}
        </ChatSDKInner>
      </ChatProvider>
    </div>
  )
})

ChatSDK.displayName = 'ChatSDK'

export default ChatSDK
