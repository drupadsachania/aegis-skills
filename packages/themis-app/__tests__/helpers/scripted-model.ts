import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { AIMessage, type BaseMessage } from '@langchain/core/messages'
import type { ChatResult } from '@langchain/core/outputs'

export type Script = (messages: BaseMessage[], callIndex: number) => AIMessage

/** Deterministic chat model for tests. The script decides text vs tool calls. */
export class ScriptedChatModel extends BaseChatModel {
  readonly calls: BaseMessage[][] = []
  private readonly script: Script
  constructor(script: Script) { super({}); this.script = script }
  _llmType(): string { return 'scripted' }
  // createReactAgent binds tools; the script already knows the tool names.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bindTools(): any { return this }
  async _generate(messages: BaseMessage[]): Promise<ChatResult> {
    this.calls.push(messages)
    const message = this.script(messages, this.calls.length - 1)
    return { generations: [{ message, text: typeof message.content === 'string' ? message.content : '' }] }
  }
}

export const contentOf = (m: BaseMessage | undefined): string =>
  m && typeof m.content === 'string' ? m.content : ''
export const systemText = (messages: BaseMessage[]): string =>
  contentOf(messages.find((m) => m._getType() === 'system'))
export const hasToolResult = (messages: BaseMessage[]): boolean =>
  messages.some((m) => m._getType() === 'tool')
export const text = (content: string): AIMessage => new AIMessage(content)
export const toolCall = (name: string, args: Record<string, unknown>): AIMessage =>
  new AIMessage({ content: '', tool_calls: [{ id: `call-${name}`, name, args, type: 'tool_call' }] })
