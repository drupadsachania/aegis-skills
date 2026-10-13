import { Annotation } from '@langchain/langgraph'
import type { OrchestrateRequest, SubTask, SubTaskResult } from '@aegis-skills/themis-core'
import type { ProviderId } from '../providers/catalog'

const replace = <T>(_prev: T, next: T): T => next
const append = <T>(prev: T[], next: T[]): T[] => [...prev, ...next]
const union = (prev: string[], next: string[]): string[] => [...new Set([...prev, ...next])]
const sum = (prev: number, next: number): number => prev + next

/**
 * LangGraph channel state. The core RunState in the store is the source of truth
 * for step, plan, results and report. This state only carries what LangGraph
 * needs: Send payloads, results produced in the current stage, approval
 * bookkeeping and token totals.
 */
export const ThemisAnnotation = Annotation.Root({
  runId: Annotation<string>({ reducer: replace, default: () => '' }),
  provider: Annotation<ProviderId>({ reducer: replace, default: () => 'anthropic' }),
  task: Annotation<string>({ reducer: replace, default: () => '' }),
  context: Annotation<OrchestrateRequest['context']>({ reducer: replace, default: () => ({ environments: [], attackSurfaceTags: [] }) }),
  currentSubTask: Annotation<SubTask | undefined>({ reducer: replace, default: () => undefined }),
  /** Results from skill-agent nodes plus approval outcomes (subTaskId prefix "approval-"). */
  stageResults: Annotation<SubTaskResult[]>({ reducer: append, default: () => [] }),
  /** Approval outcomes after the guardrail ran over them. */
  guardedOutcomes: Annotation<SubTaskResult[]>({ reducer: replace, default: () => [] }),
  settledApprovals: Annotation<string[]>({ reducer: union, default: () => [] }),
  approvalSkills: Annotation<Record<string, string>>({ reducer: (p, n) => ({ ...p, ...n }), default: () => ({}) }),
  skillTrace: Annotation<string[]>({ reducer: union, default: () => [] }),
  totalInputTokens: Annotation<number>({ reducer: sum, default: () => 0 }),
  totalOutputTokens: Annotation<number>({ reducer: sum, default: () => 0 }),
  startTime: Annotation<number>({ reducer: (p, n) => p || n, default: () => 0 }),
})

export type ThemisState = typeof ThemisAnnotation.State
export const isApprovalOutcome = (r: SubTaskResult): boolean => r.subTaskId.startsWith('approval-')
