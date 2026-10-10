import { llm } from '@/lib/themis/provider'
import { redactSecrets, isAssertedCrownJewel, attackPathContext, parseImpact, impactFallback, attackPathSystemPrompt, attackPathUserMessage, type ExposureRequest, type ImpactAssessment } from '@aegis-skills/themis-core'

export async function assessImpact(sanitisedInput: string, req: ExposureRequest): Promise<ImpactAssessment> {
  const asserted = isAssertedCrownJewel(req)
  try {
    const response = await llm({ systemPrompt: attackPathSystemPrompt(), userMessage: attackPathUserMessage(attackPathContext(req), sanitisedInput), maxTokens: 768, temperature: 0, tier: 'standard' })
    return parseImpact(response.content, asserted, redactSecrets)
  } catch {
    return impactFallback(asserted)
  }
}
