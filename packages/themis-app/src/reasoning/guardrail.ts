import { llm } from '../providers/llm'
import {
  precheckSecrets, parseGuardrailVerdict, guardrailFailure,
  guardrailSystemPrompt, guardrailUserMessage, type SubTaskResult,
} from '@aegis-skills/themis-core'

// Model call only — every rule (secret pre-check, parsing, fail-closed BLOCK)
// lives in @aegis-skills/themis-core.
export async function applyGuardrail(result: SubTaskResult): Promise<SubTaskResult> {
  const blocked = precheckSecrets(result)
  if (blocked) return blocked // do not send to LLM

  try {
    const response = await llm({
      systemPrompt: guardrailSystemPrompt(),
      userMessage: guardrailUserMessage(result),
      maxTokens: 256,
      temperature: 0,
      tier: 'fast',
    })
    return parseGuardrailVerdict(result, response.content)
  } catch {
    return guardrailFailure(result)
  }
}
