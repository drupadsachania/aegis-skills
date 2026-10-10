import { llm } from '@/lib/themis/provider'
import {
  redactSecrets, sanitiseUntrustedInput, withRedactionWarning, parseAuditClassification,
  auditClassifySystemPrompt, auditClassifyUserMessage, type AuditRequest,
} from '@aegis-skills/themis-core'

export async function ingest(req: AuditRequest): Promise<{
  sanitisedInput: string
  detectedSystemType: string
  applicableSkills: string[]
}> {
  const redacted = redactSecrets(req.input)
  const sanitisedInput = sanitiseUntrustedInput(withRedactionWarning(req.input, redacted), 'Audit input')
  const fallback = req.context.systemType ?? 'generic'

  try {
    const response = await llm({
      systemPrompt: auditClassifySystemPrompt(),
      userMessage: auditClassifyUserMessage(sanitisedInput),
      maxTokens: 256,
      temperature: 0,
      tier: 'fast',
    })
    const parsed = parseAuditClassification(response.content, fallback)
    return { sanitisedInput, detectedSystemType: parsed.systemType, applicableSkills: parsed.applicableSkills }
  } catch {
    // Fall back to defaults on any failure
    return { sanitisedInput, detectedSystemType: fallback, applicableSkills: [] }
  }
}
