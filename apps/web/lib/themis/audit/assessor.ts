import { llm } from '@/lib/themis/provider'
import { redactSecrets, parseAssessorFindings, auditAssessSystemPrompt, auditAssessUserMessage, type AuditRequest, type Finding, type Standard } from '@aegis-skills/themis-core'

async function assessStandard(
  sanitisedInput: string,
  standard: Standard,
  _context: AuditRequest['context'],
): Promise<Finding[]> {
  const response = await llm({
    systemPrompt: auditAssessSystemPrompt(standard),
    userMessage: auditAssessUserMessage(sanitisedInput),
    maxTokens: 2048,
    temperature: 0,
    tier: 'standard',
  })
  try {
    return parseAssessorFindings(response.content, redactSecrets)
  } catch {
    // JSON parse failure — log a warning (no content) and return []
    console.warn(`[audit/assessor] JSON parse failure for standard: ${standard}`)
    return []
  }
}

export async function assess(
  sanitisedInput: string,
  standards: Standard[],
  applicableSkills: string[],
  context: AuditRequest['context'],
): Promise<Finding[]> {
  // Dispatch one assessment per standard, run all concurrently
  const results = await Promise.allSettled(
    standards.map((standard) => assessStandard(sanitisedInput, standard, context)),
  )

  const allFindings: Finding[] = []
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allFindings.push(...result.value)
    }
    // On rejection: return [] for that standard — do NOT throw
  }

  return allFindings
}
