import { llm } from './provider'
import { redactSecrets, synthesiseSystemPrompt, synthesiseUserMessage, type SubTaskResult } from '@aegis-skills/themis-core'

export async function synthesise(task: string, results: SubTaskResult[]): Promise<string> {
  // Only receives non-blocked results (caller filters BLOCK before calling)
  const response = await llm({
    systemPrompt: synthesiseSystemPrompt(),
    userMessage: synthesiseUserMessage(results),
    maxTokens: 4096,
    temperature: 0.3,
    tier: 'standard',
  })
  return redactSecrets(response.content)
}
