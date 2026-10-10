import { DetectionState, EvidenceInput } from './types'

export interface DetectionResult {
  state: DetectionState
  rationale: string
}

// Detection outcome is derived DETERMINISTICALLY from supplied telemetry/EDR/SIEM
// evidence — not guessed by an LLM. The per-stage outcome words map to a single
// detection state for the case; the independent stages live in the evidence.
// With no telemetry evidence, the honest answer is NOT_TESTED, never "detected".

const PREVENT_RE = /\b(blocked|prevented|quarantined|killed|contained)\b/i
const DETECT_RE = /\b(detected|alerted|alert fired|flagged|raised)\b/i
const LOG_RE = /\b(logged|telemetry|recorded|event generated)\b/i
const MISS_RE = /\b(missed|no alert|not detected|no telemetry|undetected)\b/i

export function assessDetection(evidence: EvidenceInput[]): DetectionResult {
  const relevant = evidence.filter(
    (e) => e.type === 'telemetry' || e.type === 'edr' || e.type === 'siem',
  )

  if (relevant.length === 0) {
    return {
      state: 'NOT_TESTED',
      rationale: 'No telemetry/EDR/SIEM evidence supplied — control effectiveness not tested.',
    }
  }

  const blob = relevant.map((e) => e.summary).join(' \n ')

  // Order matters: prevention is the strongest outcome, a miss the weakest.
  if (PREVENT_RE.test(blob)) {
    return { state: 'PREVENTED', rationale: 'Supplied evidence indicates the technique was prevented.' }
  }
  if (DETECT_RE.test(blob)) {
    return { state: 'DETECTED', rationale: 'Supplied evidence indicates an alert/detection fired.' }
  }
  if (MISS_RE.test(blob) && !LOG_RE.test(blob)) {
    return { state: 'MISSED', rationale: 'Supplied evidence indicates the technique was not seen.' }
  }
  if (LOG_RE.test(blob)) {
    return { state: 'LOGGED_ONLY', rationale: 'Telemetry was recorded but no detection/alert is evidenced.' }
  }

  // Evidence present but inconclusive — do not credit a detection.
  return { state: 'MISSED', rationale: 'Telemetry evidence present but no prevention/detection indicated.' }
}
