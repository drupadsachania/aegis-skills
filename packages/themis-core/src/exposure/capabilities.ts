// Capability registry — the fixed, pre-reviewed set of validation capabilities.
//
// The planner selects from this list. It can never invent a capability. Every
// entry is scoped to minimum-sufficient-proof: it establishes a specific claim
// with the least invasive observation, and explicitly prohibits going further.
// These are planning descriptors, not executable code — this workflow does not
// run them; a separate, sandboxed execution layer (out of scope here) would.

import { Capability, TestDepth } from './types'

export const CAPABILITY_REGISTRY: Capability[] = [
  {
    id: 'VERSION-CONFIRM-001',
    category: 'applicability',
    description:
      'Confirm the affected software version/configuration is present via authenticated inventory.',
    depth: 'PASSIVE',
    impactClass: 'NONE',
    prerequisites: ['authenticated_inventory_access'],
    prohibited: ['any_interaction_with_vulnerable_function'],
    expectedEvidence: ['software', 'configuration'],
    cleanupRequired: false,
  },
  {
    id: 'REACHABILITY-CHECK-001',
    category: 'exposure',
    description:
      'Confirm the vulnerable service is reachable from the relevant network position.',
    depth: 'PASSIVE',
    impactClass: 'NONE',
    prerequisites: ['network_position_defined'],
    prohibited: ['interacting_with_vulnerable_function', 'authentication_attempts'],
    expectedEvidence: ['network'],
    cleanupRequired: false,
  },
  {
    id: 'BANNER-VERSION-001',
    category: 'exposure',
    description:
      'Observe a version-distinguishing response without exercising the vulnerable code path.',
    depth: 'LOW_IMPACT',
    impactClass: 'LOW',
    prerequisites: ['service_reachable', 'target_authorized'],
    prohibited: ['payload_delivery', 'state_modification'],
    expectedEvidence: ['network', 'software'],
    cleanupRequired: false,
  },
  {
    id: 'CONTROLLED-MARKER-001',
    category: 'exploitability',
    description:
      'Demonstrate the claimed effect using a unique, harmless, removable marker — the minimum proof of exploitability.',
    depth: 'CONTROLLED_EXECUTION',
    impactClass: 'MEDIUM',
    prerequisites: ['target_authorized', 'approver_present', 'cleanup_plan'],
    prohibited: [
      'persistence',
      'lateral_movement',
      'credential_access',
      'data_access',
      'destructive_modification',
    ],
    expectedEvidence: ['exploitation', 'telemetry'],
    cleanupRequired: true,
  },
  {
    id: 'CANARY-ACCESS-001',
    category: 'impact',
    description:
      'Prove a data-exposure or access claim by retrieving a planted canary record — never real data.',
    depth: 'CONTROLLED_EXECUTION',
    impactClass: 'MEDIUM',
    prerequisites: ['canary_planted', 'target_authorized', 'approver_present'],
    prohibited: ['bulk_data_access', 'real_record_access', 'persistence'],
    expectedEvidence: ['exploitation', 'telemetry'],
    cleanupRequired: true,
  },
  {
    id: 'RETEST-ORIGINAL-001',
    category: 'verification',
    description:
      'Re-run the exact proof that confirmed the exposure and record that it no longer succeeds.',
    depth: 'CONTROLLED_EXECUTION',
    impactClass: 'MEDIUM',
    prerequisites: ['original_proof_defined', 'target_authorized'],
    prohibited: ['substituting_a_weaker_test', 'persistence', 'lateral_movement'],
    expectedEvidence: ['verification', 'telemetry'],
    cleanupRequired: true,
  },
]

const BY_ID = new Map(CAPABILITY_REGISTRY.map((c) => [c.id, c]))

export function getCapability(id: string): Capability | undefined {
  return BY_ID.get(id)
}

export function capabilityIds(): string[] {
  return CAPABILITY_REGISTRY.map((c) => c.id)
}

const DEPTH_ORDER: TestDepth[] = ['PASSIVE', 'LOW_IMPACT', 'CONTROLLED_EXECUTION', 'IMPACT_VALIDATION']

// Capabilities at or below a permitted depth ceiling — what the planner may pick.
export function capabilitiesWithinDepth(ceiling: TestDepth): Capability[] {
  const max = DEPTH_ORDER.indexOf(ceiling)
  return CAPABILITY_REGISTRY.filter((c) => DEPTH_ORDER.indexOf(c.depth) <= max)
}
