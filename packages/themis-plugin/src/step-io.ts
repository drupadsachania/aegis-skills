// What the host AI submits for each reasoning step. Strict zod shapes; the
// plugin maps them onto themis-core's advance() outputs (core re-validates,
// redacts and fails closed again — this is the first, friendlier gate).
import { z } from 'zod'

export type ReasoningStep = 'decompose' | 'fanout' | 'guardrail' | 'synthesise'

export const MAX_HOST_SUBTASKS = 20

const SubTask = z.object({
  id: z.string().min(1).max(64),
  skill: z.string().min(1).max(64),
  description: z.string().min(1).max(2000),
  phase: z.number().int().min(0).max(50).optional().default(0),
  dependsOn: z.array(z.string()).max(MAX_HOST_SUBTASKS).optional().default([]),
}).strict()

const SubTaskResult = z.object({
  subTaskId: z.string().min(1),
  findings: z.string().max(20000),
  confidence: z.enum(['high', 'medium', 'low']).optional().default('low'),
}).strict()

const Verdict = z.object({
  subTaskId: z.string().min(1),
  guardrail: z.enum(['PASS', 'FLAG', 'BLOCK']),
  guardrailReason: z.string().max(1000).optional(),
}).strict()

const SCHEMAS = {
  decompose: z.object({ subTasks: z.array(SubTask).min(1).max(MAX_HOST_SUBTASKS) }).strict(),
  fanout: z.object({ results: z.array(SubTaskResult).min(1).max(MAX_HOST_SUBTASKS) }).strict(),
  guardrail: z.object({ results: z.array(Verdict).max(MAX_HOST_SUBTASKS) }).strict(),
  synthesise: z.object({ report: z.string().min(1).max(60000) }).strict(),
} satisfies Record<ReasoningStep, z.ZodTypeAny>

type Parsed = {
  [K in ReasoningStep]: z.infer<(typeof SCHEMAS)[K]>
}

export function isReasoningStep(s: string): s is ReasoningStep {
  return s === 'decompose' || s === 'fanout' || s === 'guardrail' || s === 'synthesise'
}

export function parseStepInput<K extends ReasoningStep>(step: K, raw: unknown): Parsed[K] {
  const schema = (SCHEMAS as Record<string, z.ZodTypeAny>)[step]
  if (!schema) throw new Error(`unknown reasoning step: ${step}`)
  return schema.parse(raw) as Parsed[K]
}

/** The shape the host must put in `output`, shown back to it with every prompt. */
export const OUTPUT_HINT: Record<ReasoningStep, string> = {
  decompose: '{"subTasks":[{"id":"st-1","skill":"<aegis skill slug>","description":"what to analyse","phase":0,"dependsOn":[]}]}',
  fanout: '{"results":[{"subTaskId":"st-1","findings":"evidence-based findings","confidence":"high|medium|low"}]}  (one entry for EVERY ready sub-task)',
  guardrail: '{"results":[{"subTaskId":"st-1","guardrail":"PASS|FLAG|BLOCK","guardrailReason":"optional"}]}  (one entry for EVERY result)',
  synthesise: '{"report":"the structured report as text"}',
}
