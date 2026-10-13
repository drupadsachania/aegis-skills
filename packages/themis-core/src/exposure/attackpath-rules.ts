import type { ExposureRequest, ImpactAssessment } from './types'
import { redactSecrets } from '../secrets'
import { coerceEdges, coerceImpact } from './coerce'

export function isAssertedCrownJewel(req: ExposureRequest): boolean {
  return req.context.crownJewel === true || req.context.businessCriticality === 'crown-jewel'
}

export function attackPathContext(req: ExposureRequest) {
  return {
    assetId: req.context.assetId ?? 'unspecified',
    crownJewelAsset: isAssertedCrownJewel(req),
    environments: req.context.environments,
  }
}

/** UNKNOWN is never downgraded to CONTAINED. Throws on invalid JSON. */
export function parseImpact(content: string, assertedCrownJewel: boolean, redact: (s: string) => string = redactSecrets): ImpactAssessment {
  const parsed = JSON.parse(content) as Record<string, unknown>
  let state = coerceImpact(parsed.impact)
  const path = coerceEdges(parsed.path)
  let reachesCrownJewel = parsed.reachesCrownJewel === true
  // A crown-jewel asset itself is reachable by definition if exposed on it.
  if (assertedCrownJewel) {
    reachesCrownJewel = true
    if (state === 'CONTAINED' || state === 'UNKNOWN') state = 'CROWN_JEWEL_REACHABLE'
  }
  return {
    state,
    path,
    reachesCrownJewel,
    earliestBreakableEdge:
      typeof parsed.earliestBreakableEdge === 'string' && parsed.earliestBreakableEdge.trim()
        ? parsed.earliestBreakableEdge
        : undefined,
    notes: redact(typeof parsed.notes === 'string' ? parsed.notes : ''),
  }
}

export function impactFallback(assertedCrownJewel: boolean): ImpactAssessment {
  return {
    state: assertedCrownJewel ? 'CROWN_JEWEL_REACHABLE' : 'UNKNOWN',
    path: [],
    reachesCrownJewel: assertedCrownJewel,
    notes: 'Attack-path analysis unavailable; impact not mapped (UNKNOWN ≠ CONTAINED).',
  }
}
