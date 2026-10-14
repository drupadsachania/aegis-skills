import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { HumanMessage, SystemMessage, type BaseMessage } from '@langchain/core/messages'
import {
  formatFindings, redactSecrets, skillAgentSystemPrompt, skillAgentUserMessage,
  type SubTask, type SubTaskResult,
} from '@aegis-skills/themis-core'
import { chatModel } from '../providers/models'
import { llm } from '../providers/llm'
import type { ProviderId } from '../providers/catalog'
import { fetchSkillPhaseTool, makeReadFindingsTool, loadPhase } from './tools'
import { buildGatewayTools } from './gateway-tools'
import { noToolsUserMessage } from './no-tools-prompt'
import type { RunGateways } from './run-gateways'

export type ToolMode = 'tools' | 'no-tools'
export interface SkillAgentInput { runId: string; provider: ProviderId; mode: ToolMode; subTask: SubTask; priorResults: SubTaskResult[] }
export interface SkillAgentDeps {
  gateways: RunGateways
  onApproval(runId: string, approvalId: string, skill: string): void
  onNotice(runId: string, message: string): void
}
export interface SkillAgentOutcome { result: SubTaskResult; inputTokens: number; outputTokens: number; approvalSkills: Record<string, string> }

const textOf = (m: BaseMessage | undefined): string =>
  !m ? '' : typeof m.content === 'string' ? m.content : JSON.stringify(m.content)

function looksLikeToolRejection(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e)
  return /tool|function/i.test(msg) && /support|not allowed|invalid|unrecogni[sz]ed|unknown/i.test(msg)
}

function failed(sub: SubTask): SkillAgentOutcome {
  return {
    result: { subTaskId: sub.id, skill: sub.skill, findings: 'Sub-task analysis could not be completed', confidence: 'low', guardrail: 'FLAG', inputTokens: 0, outputTokens: 0 },
    inputTokens: 0, outputTokens: 0, approvalSkills: {},
  }
}

async function withTools(i: SkillAgentInput, deps: SkillAgentDeps): Promise<SkillAgentOutcome> {
  const gw = deps.gateways.get(i.runId, i.subTask.skill)
  const approvalSkills: Record<string, string> = {}
  const external = await buildGatewayTools(gw, i.subTask.skill, (id) => {
    approvalSkills[id] = i.subTask.skill
    deps.gateways.markProposed(id, i.runId, i.subTask.skill)
    deps.onApproval(i.runId, id, i.subTask.skill)
  })
  const agent = createReactAgent({
    llm: chatModel(i.provider, i.subTask.tier),
    tools: [fetchSkillPhaseTool, makeReadFindingsTool(i.priorResults), ...external],
    prompt: new SystemMessage(skillAgentSystemPrompt()),
  })
  // Outbound sanitisation: the sub-task text goes to the model provider, so redact it first (gateway results are
  // redacted by the gateway, and the local tools only return skill text and already-redacted findings).
  const out = await agent.invoke({ messages: [new HumanMessage(redactSecrets(skillAgentUserMessage(i.subTask)))] })
  const messages: BaseMessage[] = out.messages ?? []
  let inputTokens = 0
  let outputTokens = 0
  for (const m of messages) {
    const u = (m as { usage_metadata?: { input_tokens?: number; output_tokens?: number } }).usage_metadata
    inputTokens += u?.input_tokens ?? 0
    outputTokens += u?.output_tokens ?? 0
  }
  const findings = redactSecrets(textOf(messages[messages.length - 1]) || 'No findings produced')
  return {
    result: { subTaskId: i.subTask.id, skill: i.subTask.skill, findings, confidence: 'high', guardrail: 'PASS', inputTokens, outputTokens },
    inputTokens, outputTokens, approvalSkills,
  }
}

async function withoutTools(i: SkillAgentInput): Promise<SkillAgentOutcome> {
  const phase = loadPhase(i.subTask.skill, String(i.subTask.phase))
  const methodology = phase.ok ? phase.text : `${phase.text} Rely on general security practice and say so.`
  const prior = formatFindings(i.priorResults.filter((r) => i.subTask.dependsOn.includes(r.subTaskId)), '').slice(0, 4000)
  const res = await llm({
    systemPrompt: skillAgentSystemPrompt(),
    userMessage: noToolsUserMessage(i.subTask, methodology, prior),
    maxTokens: 2048, temperature: 0.3, tier: i.subTask.tier,
  })
  return {
    result: { subTaskId: i.subTask.id, skill: i.subTask.skill, findings: res.content || 'No findings produced', confidence: 'medium', guardrail: 'PASS', inputTokens: res.inputTokens, outputTokens: res.outputTokens },
    inputTokens: res.inputTokens, outputTokens: res.outputTokens, approvalSkills: {},
  }
}

/** Never throws: a failed sub-agent yields a low-confidence FLAG result, as before. */
export async function runSkillAgent(i: SkillAgentInput, deps: SkillAgentDeps): Promise<SkillAgentOutcome> {
  try {
    return i.mode === 'tools' ? await withTools(i, deps) : await withoutTools(i)
  } catch (e) {
    if (i.mode === 'tools' && looksLikeToolRejection(e)) {
      deps.onNotice(i.runId, `The model rejected tool calling; sub-task ${i.subTask.id} ran without tools.`)
      try { return await withoutTools(i) } catch { return failed(i.subTask) }
    }
    return failed(i.subTask)
  }
}
