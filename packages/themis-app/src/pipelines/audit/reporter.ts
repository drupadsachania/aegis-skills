import { llm } from '@/lib/themis/provider'
import { redactSecrets, auditReportSystemPrompt, auditReportUserMessage, type AuditRequest, type Finding, type Standard } from '@aegis-skills/themis-core'

export async function report(
  req: AuditRequest,
  findings: Finding[],
  standards: Standard[],
  skillTrace: string[],
): Promise<string> {
  try {
    const response = await llm({
      systemPrompt: auditReportSystemPrompt(),
      userMessage: auditReportUserMessage(findings, standards),
      maxTokens: 1024,
      temperature: 0,
      tier: 'standard',
    })

    return redactSecrets(response.content)
  } catch {
    return 'Executive summary unavailable.'
  }
}
