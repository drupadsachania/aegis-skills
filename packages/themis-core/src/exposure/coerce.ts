import type { AttackPathEdge, Confidence, ExposureState, ImpactState } from './types'

export const VALID_EXPOSURE: readonly ExposureState[] = ['NOT_APPLICABLE', 'NO_EXPOSURE', 'POTENTIAL_EXPOSURE', 'VALIDATION_REQUIRED']
export const VALID_IMPACT: readonly ImpactState[] = ['CROWN_JEWEL_REACHABLE', 'LIMITED', 'CONTAINED', 'UNKNOWN']

export function coerceExposure(v: unknown): ExposureState | null {
  return typeof v === 'string' && (VALID_EXPOSURE as string[]).includes(v) ? (v as ExposureState) : null
}
export function coerceConfidence(v: unknown): Confidence {
  return v === 'high' || v === 'medium' || v === 'low' ? v : 'unknown'
}
export function coerceTri(v: unknown): boolean | 'unknown' {
  if (v === true || v === false) return v
  return 'unknown'
}
export function coerceImpact(v: unknown): ImpactState {
  return typeof v === 'string' && (VALID_IMPACT as string[]).includes(v) ? (v as ImpactState) : 'UNKNOWN'
}
export function coerceEdges(v: unknown): AttackPathEdge[] {
  if (!Array.isArray(v)) return []
  return (v as unknown[])
    .map((e): AttackPathEdge | null => {
      if (typeof e !== 'object' || e === null) return null
      const o = e as Record<string, unknown>
      if (typeof o.from !== 'string' || typeof o.to !== 'string') return null
      return {
        from: o.from,
        to: o.to,
        relationship: typeof o.relationship === 'string' ? o.relationship : 'REACHES',
        confidence: coerceConfidence(o.confidence),
        // An edge is only a fact if the model marks it evidenced.
        evidenced: o.evidenced === true,
      }
    })
    .filter((e): e is AttackPathEdge => e !== null)
    .slice(0, 12)
}
