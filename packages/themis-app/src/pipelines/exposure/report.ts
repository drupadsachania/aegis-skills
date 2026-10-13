import { llm } from '../../providers/llm'
import { redactSecrets, caseFacts, exposureReportSystemPrompt, exposureReportUserMessage, type ReportInput } from '@aegis-skills/themis-core'

export type { ReportInput }

/** The model EXPLAINS deterministic states; it may not change them. */
export async function report(input: ReportInput): Promise<string> {
  try {
    const response = await llm({ systemPrompt: exposureReportSystemPrompt(), userMessage: exposureReportUserMessage(caseFacts(input)), maxTokens: 768, temperature: 0, tier: 'standard' })
    return redactSecrets(response.content)
  } catch {
    return 'Executive summary unavailable.'
  }
}
