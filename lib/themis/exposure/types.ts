// Exposure Validation (CTEM) workflow — domain types.
//
// Mirrors the exposure-validation skill: vulnerability, exposure, exploitability,
// impact, detection, remediation and verification are INDEPENDENT states, each
// carrying its own evidence. This workflow is a reasoning/planning/orchestration
// layer — it never executes an exploit. Authorization, the capability registry,
// risk scoring and state transitions are deterministic; the LLM only reasons,
// correlates, plans and explains.

// ── Independent state dimensions ────────────────────────────────────────────

export type ExposureState =
  | 'NOT_APPLICABLE'
  | 'NO_EXPOSURE'
  | 'POTENTIAL_EXPOSURE'
  | 'VALIDATION_REQUIRED'

export type ExploitabilityState =
  | 'CONFIRMED'
  | 'NOT_EXPLOITABLE'
  | 'NOT_VALIDATED'
  | 'UNKNOWN'

export type ImpactState =
  | 'CROWN_JEWEL_REACHABLE'
  | 'LIMITED'
  | 'CONTAINED'
  | 'UNKNOWN'

export type DetectionState =
  | 'PREVENTED'
  | 'DETECTED'
  | 'LOGGED_ONLY'
  | 'MISSED'
  | 'NOT_TESTED'

export type RemediationState =
  | 'NONE'
  | 'COMPENSATING_CONTROL'
  | 'IN_PROGRESS'
  | 'APPLIED'

export type VerificationState =
  | 'NOT_VERIFIED'
  | 'VERIFIED_CLOSED'
  | 'PARTIAL'
  | 'FAILED'

// Lifecycle workflow state (the state machine from the skill).
export type WorkflowState =
  | 'DISCOVERED'
  | 'ASSESSED'
  | 'VALIDATION_PENDING'
  | 'BLOCKED'
  | 'CONFIRMED_EXPOSURE'
  | 'IMPACT_ASSESSED'
  | 'REMEDIATION_REQUIRED'
  | 'RETEST_PENDING'
  | 'MITIGATED'
  | 'VERIFIED_CLOSED'
  | 'REOPENED'
  | 'EXPIRED'
  | 'CONTROLLED'

export type Confidence = 'high' | 'medium' | 'low' | 'unknown'

// ── Request ─────────────────────────────────────────────────────────────────

export interface ExposureRequest {
  // Free text / config / advisory describing the vulnerability and the asset.
  // Max 12000 chars after sanitisation. Untrusted.
  input: string
  cve?: string                 // optional explicit CVE id
  kevListed?: boolean          // caller-asserted KEV status
  epss?: number                // 0..1 exploitation probability, if known
  // Evidence the caller already holds (e.g. from an authorized sandbox run).
  // Without evidence, exploitability cannot be CONFIRMED by this workflow.
  providedEvidence?: EvidenceInput[]
  authorization: AuthorizationContext
  context: {
    assetId?: string
    systemType?: string        // "linux-server", "k8s-cluster", "aws-account", "ot-network"
    businessCriticality?: BusinessCriticality
    environments: string[]
    crownJewel?: boolean        // caller-asserted: is the asset itself a crown jewel
  }
}

export type BusinessCriticality = 'crown-jewel' | 'high' | 'medium' | 'low' | 'unknown'

export interface AuthorizationContext {
  authorized: boolean          // is there a current written mandate for this target+test
  scopeConfirmed: boolean      // is the target explicitly inside approved scope
  targetIdentityVerified: boolean
  maintenanceWindow?: boolean  // inside an approved change window
  approver?: string            // named approver, if one has signed off
  expiresAt?: string           // ISO; authorization validity end
}

export interface EvidenceInput {
  type: EvidenceType
  summary: string              // what was observed (untrusted; redacted + sanitised)
  source: string               // which system observed it
}

export type EvidenceType =
  | 'asset'
  | 'network'
  | 'configuration'
  | 'software'
  | 'vulnerability'
  | 'exploitation'
  | 'telemetry'
  | 'edr'
  | 'siem'
  | 'remediation'
  | 'verification'

// ── Policy ──────────────────────────────────────────────────────────────────

export type PolicyDecision =
  | 'ALLOW'
  | 'DENY'
  | 'REQUIRE_APPROVAL'
  | 'REQUIRE_CHANGE_WINDOW'
  | 'REQUIRE_TARGET_CONFIRMATION'

export interface PolicyResult {
  decision: PolicyDecision
  reasons: string[]            // deterministic, human-readable reasons
  highestDepthPermitted: TestDepth
}

// ── Validation planning (plan only — never executed here) ───────────────────

export type TestDepth = 'PASSIVE' | 'LOW_IMPACT' | 'CONTROLLED_EXECUTION' | 'IMPACT_VALIDATION'
export type ImpactClass = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'

export interface Capability {
  id: string                   // e.g. "VERSION-CONFIRM-001"
  category: string
  description: string
  depth: TestDepth
  impactClass: ImpactClass
  prerequisites: string[]
  prohibited: string[]
  expectedEvidence: EvidenceType[]
  cleanupRequired: boolean
}

export interface ValidationStep {
  capabilityId: string
  rationale: string            // why this capability proves the claim
  expectedEvidence: EvidenceType[]
}

export interface ValidationPlan {
  claim: string                // the security claim to be proven
  steps: ValidationStep[]      // selected from the registry only
  depth: TestDepth             // highest depth in the plan
  requiresApproval: boolean
  approvalRequirements: string[]
  blocked: boolean             // true when policy denies / gates the plan
  blockReason?: string
}

// ── Attack path / impact ────────────────────────────────────────────────────

export interface AttackPathEdge {
  from: string
  to: string
  relationship: string         // REACHES | AUTHENTICATES_TO | CAN_EXECUTE | TRUSTS | ...
  confidence: Confidence
  evidenced: boolean           // false = hypothesis to validate, not a fact
}

export interface ImpactAssessment {
  state: ImpactState
  path: AttackPathEdge[]
  reachesCrownJewel: boolean
  earliestBreakableEdge?: string
  notes: string
}

// ── Risk (deterministic) ────────────────────────────────────────────────────

export interface RiskAssessment {
  score: number                // 0..100
  band: 'critical' | 'high' | 'medium' | 'low' | 'informational' | 'unknown'
  factors: {
    threatLikelihood: number   // 0..1
    exposure: number
    exploitability: number
    businessCriticality: number
    attackPathImpact: number
    controlWeakness: number
  }
  confidence: Confidence       // capped by weakest evidenced input
  rationale: string[]          // deterministic explanation of the score
}

// ── Case + report ───────────────────────────────────────────────────────────

export interface ExposureCase {
  caseId: string
  cve?: string
  assetId?: string
  workflowState: WorkflowState
  states: {
    exposure: ExposureState
    exploitability: ExploitabilityState
    impact: ImpactState
    detection: DetectionState
    remediation: RemediationState
    verification: VerificationState
  }
  exploitabilityConfidence: Confidence
  // Set when a validation attempt could not complete — the reason the state is
  // NOT_VALIDATED rather than NOT_EXPLOITABLE.
  validationFailure?: ValidationFailure
}

export type ValidationFailure =
  | 'AUTHORIZATION_FAILURE'
  | 'SCOPE_FAILURE'
  | 'TARGET_AMBIGUOUS'
  | 'PRECONDITION_FAILURE'
  | 'EXECUTION_FAILURE'
  | 'TIMEOUT'
  | 'TELEMETRY_UNAVAILABLE'
  | 'EVIDENCE_INSUFFICIENT'
  | 'POLICY_DENIED'
  | 'NO_EXECUTION_LAYER'   // this workflow plans but does not execute

export interface RiskDelta {
  before: RiskAssessment
  after: RiskAssessment | null
  delta: number | null         // before.score - after.score, when verified
  proven: boolean              // only true when a retest/verification backs `after`
}

export interface ExposureReport {
  case: ExposureCase
  plan: ValidationPlan
  impact: ImpactAssessment
  risk: RiskDelta
  policy: PolicyResult
  evidence: EvidenceInput[]    // redacted
  executiveSummary: string
  // Plain-language answers to the seven explainability questions.
  explain: {
    whyExposed: string
    whyItMatters: string
    whatProvesExploitability: string
    assetAffected: string
    controlOutcome: string
    remediation: string
    whatProvesClosed: string
  }
  skillTrace: string[]
  durationMs: number
}
