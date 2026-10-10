import { llm } from '@/lib/themis/provider'
import { redactSecrets, capabilitiesWithinDepth, deniedPlan, plannerCatalogue, parsePlannerResponse, passiveFallbackSteps, finalisePlan, plannerSystemPrompt, plannerUserMessage, type PolicyResult, type ValidationPlan } from '@aegis-skills/themis-core'

/** Selects only registry capabilities within the policy ceiling; never executes. */
export async function plan(claim: string, sanitisedInput: string, policy: PolicyResult): Promise<ValidationPlan> {
  if (policy.decision === 'DENY') return deniedPlan(claim, policy)
  const allowed = capabilitiesWithinDepth(policy.highestDepthPermitted)
  try {
    const response = await llm({ systemPrompt: plannerSystemPrompt(), userMessage: plannerUserMessage(claim, plannerCatalogue(allowed), sanitisedInput), maxTokens: 512, temperature: 0, tier: 'standard' })
    const parsed = parsePlannerResponse(response.content, claim, allowed, redactSecrets)
    return finalisePlan(parsed.claim, parsed.steps, policy)
  } catch {
    return finalisePlan(claim, passiveFallbackSteps(allowed), policy)
  }
}
