import type { SubTask, Tier } from './types'

// Domain-specific tier overrides — some high-phase skills need power tier for analysis quality
const POWER_TIER_SKILLS = new Set([
  'malware-analysis', 'reverse-engineering', 'digital-forensics',
  'identity-access-management', 'threat-modeling'
])
const FAST_TIER_SKILLS = new Set([
  'compliance', 'governance'  // structured query skills — fast tier sufficient
])

export function assignTier(phases: number, skill?: string): Tier {
  if (skill && POWER_TIER_SKILLS.has(skill)) return 'power'
  if (skill && FAST_TIER_SKILLS.has(skill)) return 'fast'
  if (phases <= 2) return 'fast'
  if (phases <= 5) return 'standard'
  return 'power'
}

// Upper bound on sub-agents per run. Each sub-agent is a ReAct loop that can
// also spend MCP tool calls, so an unbounded plan is a cost/DoS vector — a
// crafted task must not be able to fan out to dozens of agents.
export const MAX_SUBTASKS = 8

/**
 * Normalise the planner's raw output into a safe, executable plan:
 *  - drop sub-tasks whose skill is not a real skill slug
 *  - de-duplicate ids, cap at MAX_SUBTASKS
 *  - keep only dependencies on ids that exist in the plan
 *  - break dependency cycles so staged execution always makes progress
 * Pure function — no I/O — so it can be tested directly.
 */
export function normaliseSubTasks(raw: SubTask[], skillSlugs: string[]): SubTask[] {
  const valid = new Set(skillSlugs)
  const seen = new Set<string>()
  const kept: SubTask[] = []

  for (const t of raw) {
    if (!valid.has(t.skill)) continue
    let id = t.id.trim() || `st-${kept.length + 1}`
    while (seen.has(id)) id = `${id}-dup`
    seen.add(id)
    kept.push({ ...t, id })
    if (kept.length >= MAX_SUBTASKS) break
  }

  const ids = new Set(kept.map(t => t.id))
  for (const t of kept) {
    t.dependsOn = [...new Set(t.dependsOn.filter(d => d !== t.id && ids.has(d)))]
  }

  // Break cycles: walk in plan order and drop any dependency on a task that is
  // not yet guaranteed to be schedulable (i.e. would close a cycle).
  const placed = new Set<string>()
  let progress = true
  const remaining = new Map(kept.map(t => [t.id, t]))
  while (remaining.size > 0 && progress) {
    progress = false
    for (const [id, t] of remaining) {
      if (t.dependsOn.every(d => placed.has(d))) {
        placed.add(id)
        remaining.delete(id)
        progress = true
      }
    }
  }
  // Anything left is in a cycle — release it by keeping only already-placed deps.
  for (const t of remaining.values()) {
    t.dependsOn = t.dependsOn.filter(d => placed.has(d))
    placed.add(t.id)
  }

  return kept
}

/** Coerce untrusted planner items into SubTasks (tier assigned deterministically). */
export function coerceSubTasks(items: unknown[]): SubTask[] {
  return items.map((item: unknown) => {
    if (typeof item !== 'object' || item === null) throw new Error('SubTask item is not an object')
    const t = item as Record<string, unknown>
    const phases = typeof t.phase === 'number' ? t.phase + 1 : 1
    return {
      id: String(t.id ?? ''),
      description: String(t.description ?? ''),
      skill: String(t.skill ?? ''),
      phase: typeof t.phase === 'number' ? t.phase : 0,
      tier: assignTier(phases, String(t.skill ?? '')),
      dependsOn: Array.isArray(t.dependsOn) ? (t.dependsOn as unknown[]).map(String) : [],
    } satisfies SubTask
  })
}

/** Parse the decompose model response. Throws on invalid JSON / shape (caller retries). */
export function parseDecomposeResponse(content: string): SubTask[] {
  const parsed = JSON.parse(content)
  if (!Array.isArray(parsed)) throw new Error('Decompose response is not an array')
  return coerceSubTasks(parsed)
}
