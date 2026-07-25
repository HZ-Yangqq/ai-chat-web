/**
 * action 常量 + ChatAction 判别联合类型。
 */
import type {
  CustomInterrupt,
  Message,
  PendingInterrupt,
  Thread,
  ToolExecutionState,
  ToolStatus,
  UserInfo,
} from '../core/types'

export const SET_LOGIN_STATUS = 'SET_LOGIN_STATUS' as const
export const SET_THREADS = 'SET_THREADS' as const
export const NEW_THREAD = 'NEW_THREAD' as const
export const SWITCH_THREAD = 'SWITCH_THREAD' as const
export const SET_THREAD_LOAD_ERROR = 'SET_THREAD_LOAD_ERROR' as const
export const ADD_USER_MESSAGE = 'ADD_USER_MESSAGE' as const
export const MESSAGES_SNAPSHOT = 'MESSAGES_SNAPSHOT' as const
export const START_RUN = 'START_RUN' as const
export const START_AI_MESSAGE = 'START_AI_MESSAGE' as const
export const APPEND_AI_CONTENT = 'APPEND_AI_CONTENT' as const
export const START_THINKING = 'START_THINKING' as const
export const UPDATE_THINKING = 'UPDATE_THINKING' as const
export const COMPLETE_THINKING = 'COMPLETE_THINKING' as const
export const COMPLETE_AI_MESSAGE = 'COMPLETE_AI_MESSAGE' as const
export const SET_ERROR = 'SET_ERROR' as const
export const FINISH_RUN = 'FINISH_RUN' as const
export const ABORT_RUN = 'ABORT_RUN' as const
export const TOOL_CALL_START = 'TOOL_CALL_START' as const
export const TOOL_CALL_ARGS = 'TOOL_CALL_ARGS' as const
export const TOOL_CALL_END = 'TOOL_CALL_END' as const
export const TOOL_EXEC_START = 'TOOL_EXEC_START' as const
export const TOOL_EXEC_UPDATE = 'TOOL_EXEC_UPDATE' as const
export const TOOL_EXEC_COMPLETE = 'TOOL_EXEC_COMPLETE' as const
export const TOGGLE_HISTORY_PANEL = 'TOGGLE_HISTORY_PANEL' as const
export const SET_PENDING_INTERRUPT = 'SET_PENDING_INTERRUPT' as const
export const CLEAR_PENDING_INTERRUPT = 'CLEAR_PENDING_INTERRUPT' as const
export const SET_CUSTOM_INTERRUPTS = 'SET_CUSTOM_INTERRUPTS' as const
export const REMOVE_PENDING_MESSAGE = 'REMOVE_PENDING_MESSAGE' as const

export type ChatAction =
  | { type: typeof SET_LOGIN_STATUS; payload: { isLoggedIn: boolean; userInfo?: UserInfo | null } }
  | { type: typeof SET_THREADS; payload: Thread[] }
  | { type: typeof NEW_THREAD; payload: { threadId: string; skipThreadsList?: boolean } }
  | { type: typeof SWITCH_THREAD; payload: { threadId: string; messages?: Message[] } }
  | { type: typeof SET_THREAD_LOAD_ERROR; payload: { error?: string } }
  | { type: typeof ADD_USER_MESSAGE; payload: { id: string; content: string } }
  | { type: typeof MESSAGES_SNAPSHOT; payload: { messages: any[] } }
  | { type: typeof START_RUN; payload: { runId: string } }
  | { type: typeof START_AI_MESSAGE; payload: { messageId: string } }
  | { type: typeof APPEND_AI_CONTENT; payload: { delta: string; messageId?: string } }
  | { type: typeof START_THINKING; payload?: undefined }
  | { type: typeof UPDATE_THINKING; payload: { delta: string } }
  | { type: typeof COMPLETE_THINKING; payload?: undefined }
  | { type: typeof COMPLETE_AI_MESSAGE; payload?: undefined }
  | { type: typeof SET_ERROR; payload: { error?: string; displayMessage?: string } }
  | { type: typeof FINISH_RUN; payload?: undefined }
  | { type: typeof ABORT_RUN; payload?: undefined }
  | { type: typeof TOGGLE_HISTORY_PANEL; payload?: undefined }
  | {
      type: typeof TOOL_CALL_START
      payload: { messageId: string; toolCallId: string; cardType: string; displayMessage?: string }
    }
  | {
      type: typeof TOOL_CALL_ARGS
      payload: { messageId: string; toolCallId: string; args: Record<string, any> }
    }
  | {
      type: typeof TOOL_CALL_END
      payload: { messageId: string; toolCallId: string; displayMessage?: string }
    }
  | {
      type: typeof TOOL_EXEC_START
      payload: {
        toolCallId: string
        toolCallName: string
        messageId: string
        statusConfig?: ToolStatus
      }
    }
  | {
      type: typeof TOOL_EXEC_UPDATE
      payload: {
        toolCallId: string
        phase: ToolExecutionState['phase']
        result?: any
        error?: Error
      }
    }
  | {
      type: typeof TOOL_EXEC_COMPLETE
      payload: { toolCallId: string; phase: 'success' | 'error'; result?: any; error?: Error }
    }
  | {
      type: typeof SET_PENDING_INTERRUPT
      payload: PendingInterrupt & { interruptToolCallIds?: string[] }
    }
  | { type: typeof CLEAR_PENDING_INTERRUPT; payload?: undefined }
  | {
      type: typeof SET_CUSTOM_INTERRUPTS
      payload: { messageId: string; interrupts: CustomInterrupt[] }
    }
  | { type: typeof REMOVE_PENDING_MESSAGE; payload?: undefined }
