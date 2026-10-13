import { llm } from '../../providers/llm'
import {
  redactSecrets, sanitiseUntrustedInput, withRedactionWarning, parseExposureClassification, anchorExposureSkill,
  exposureClassifySystemPrompt, exposureClassifyUserMessage, type ExposureRequest,
} from '@aegis-skills/themis-core'

export interface IngestResult {
  sanitisedInput: string
  detectedSystemType: string
  detectedProduct: string
  applicableSkills: string[]
}

/**
 * Sanitise + redact the untrusted input, then classify the asset context.
 * The LLM only classifies — it is told the input is untrusted data, not commands.
 */
export async function ingest(req: ExposureRequest): Promise<IngestResult> {
  const redacted = redactSecrets(req.input)
  const sanitisedInput = sanitiseUntrustedInput(withRedactionWarning(req.input, redacted), 'Exposure input')

  const fallback = req.context.systemType ?? 'generic'
  let detectedSystemType = fallback
  let detectedProduct = ''
  let applicableSkills: string[] = []

  try {
    const response = await llm({ systemPrompt: exposureClassifySystemPrompt(), userMessage: exposureClassifyUserMessage(sanitisedInput), maxTokens: 256, temperature: 0, tier: 'fast' })
    const parsed = parseExposureClassification(response.content, fallback)
    detectedSystemType = parsed.systemType
    detectedProduct = parsed.affectedProduct
    applicableSkills = parsed.applicableSkills
  } catch {
    detectedSystemType = fallback
    detectedProduct = ''
    applicableSkills = []
  }

  return { sanitisedInput, detectedSystemType, detectedProduct, applicableSkills: anchorExposureSkill(applicableSkills) }
}
