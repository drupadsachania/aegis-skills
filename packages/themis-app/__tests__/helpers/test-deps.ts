import type { BaseMessage } from '@langchain/core/messages'
import { contentOf, hasToolResult, systemText, text, toolCall, type Script } from './scripted-model'

export interface ScriptOptions {
  plan: Array<{ id: string; description: string; skill: string; phase: number; dependsOn: string[] }>
  /** Sub-agents whose task description matches call this tool once. */
  toolCall?: { when: RegExp; name: string; args: Record<string, unknown> }
  failAgentsWith?: Error
}

/** Routes by system prompt: decompose → plan, skill agent → findings/tool call, guardrail → PASS, else report. */
export function standardScript(o: ScriptOptions): Script {
  return (messages: BaseMessage[]) => {
    const sys = systemText(messages)
    const human = contentOf([...messages].reverse().find((m) => m._getType() === 'human'))
    if (/observe-and-recommend/.test(sys)) {
      if (o.failAgentsWith) throw o.failAgentsWith
      if (o.toolCall && o.toolCall.when.test(human) && !hasToolResult(messages) && !/<methodology>/.test(human)) {
        return toolCall(o.toolCall.name, o.toolCall.args)
      }
      return text(`FINDINGS: ${(/<sub_task>\n([^\n]*)/.exec(human)?.[1] ?? 'none').slice(0, 60)}`)
    }
    if (/guardrail/i.test(sys)) return text('{"verdict":"PASS"}')
    if (/planner|decompos/i.test(sys)) return text(JSON.stringify(o.plan))
    return text('REPORT: synthesised findings')
  }
}
