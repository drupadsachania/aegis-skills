import type { Confidence, ExposureRequest, ExposureState } from './types'
import { redactSecrets } from '../secrets'
import { coerceConfidence, coerceExposure, coerceTri } from './coerce'

export interface CorrelationResult {
  exposure: ExposureState
  confidence: Confidence
  rationale: string
  reachable: boolean | 'unknown'
  affectedVersionPresent: boolean | 'unknown'
}

export function correlationContext(req: ExposureRequest, detectedProduct: string) {
  return {
    cve: req.cve ?? 'unspecified',
    product: detectedProduct || 'unspecified',
    systemType: req.context.systemType ?? 'generic',
    environments: req.context.environments,
  }
}

/** Never promotes a claim to "exploitable" — exposure is validated against the allowed set. Throws on invalid JSON. */
export function parseCorrelation(content: string, redact: (s: string) => string = redactSecrets): CorrelationResult {
  const parsed = JSON.parse(content) as Record<string, unknown>
  const exposure = coerceExposure(parsed.exposure) ?? 'POTENTIAL_EXPOSURE'
  return {
    exposure,
    confidence: coerceConfidence(parsed.confidence),
    rationale: redact(typeof parsed.rationale === 'string' ? parsed.rationale : ''),
    reachable: coerceTri(parsed.reachable),
    affectedVersionPresent: coerceTri(parsed.affectedVersionPresent),
  }
}

/** Conservative fallback: cannot determine → requires validation, unknown confidence. */
export function correlationFallback(): CorrelationResult {
  return {
    exposure: 'VALIDATION_REQUIRED',
    confidence: 'unknown',
    rationale: 'Correlation unavailable; defaulting to VALIDATION_REQUIRED (conservative).',
    reachable: 'unknown',
    affectedVersionPresent: 'unknown',
  }
}
