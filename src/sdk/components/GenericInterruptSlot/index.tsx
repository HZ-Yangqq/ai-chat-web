import { useChat } from '../../context'
import { useAboveInput } from '../../context/useChat'
import GenericInterruptContainer from '../GenericInterruptContainer'

const SLOT_ID = '__sdk_generic_interrupt__'

/** 把通用打断容器注册到输入框上方插槽；本身不渲染内容。 */
export default function GenericInterruptSlot() {
  const { state, continueRun } = useChat()
  const pending = state.pendingInterrupt
  const node = pending ? (
    <GenericInterruptContainer
      key={pending.runId}
      pending={pending}
      onContinue={continueRun}
      disabled={pending.disabled}
    />
  ) : null
  useAboveInput(SLOT_ID, node, [pending, continueRun])
  return null
}
