import { llm } from '../../providers/llm'
import { redactSecrets, correlationContext, parseCorrelation, correlationFallback, correlateSystemPrompt, correlateUserMessage, type CorrelationResult, type ExposureRequest } from '@aegis-skills/themis-core'

export type { CorrelationResult }

export async function correlate(sanitisedInput: string, detectedProduct: string, req: ExposureRequest): Promise<CorrelationResult> {
  try {
    const response = await llm({ systemPrompt: correlateSystemPrompt(), userMessage: correlateUserMessage(correlationContext(req, detectedProduct), sanitisedInput), maxTokens: 512, temperature: 0, tier: 'standard' })
    return parseCorrelation(response.content, redactSecrets)
  } catch {
    return correlationFallback()
  }
}
