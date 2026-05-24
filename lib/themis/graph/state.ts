import { Annotation } from '@langchain/langgraph'
import type { SubTask, SubTaskResult, OrchestrateRequest, Provider } from '../types'

/**
 * ThemisAnnotation — shared state that flows through every node in the graph.
 *
 * Reducer semantics:
 *  - Array fields (subTasks, subTaskResults, guardrailedResults): append
 *    → parallel fan-out nodes each write their own slice; LangGraph merges them
 *  - Numeric token fields: sum → each node adds its own tokens
 *  - skillTrace: deduplicating union → no duplicate skill slugs in the trace
 *  - All other fields: last-write-wins (only one node writes them)
 */
export const ThemisAnnotation = Annotation.Root({
  // ── Input fields ──────────────────────────────────────────────────────────
  task: Annotation<string>({
    reducer: (_prev: string, next: string) => next,
    default: () => '',
  }),
  context: Annotation<OrchestrateRequest['context']>({
    reducer: (_prev: OrchestrateRequest['context'], next: OrchestrateRequest['context']) => next,
    default: () => ({ environments: [], attackSurfaceTags: [] }),
  }),
  provider: Annotation<Provider | undefined>({
    reducer: (_prev: Provider | undefined, next: Provider | undefined) => next,
    default: () => undefined,
  }),

  // ── Pipeline data ─────────────────────────────────────────────────────────
  subTasks: Annotation<SubTask[]>({
    reducer: (prev: SubTask[], next: SubTask[]) => [...prev, ...next],
    default: () => [],
  }),
  // currentSubTask is set by the fan-out Send for each parallel skill agent
  currentSubTask: Annotation<SubTask | undefined>({
    reducer: (_prev: SubTask | undefined, next: SubTask | undefined) => next,
    default: () => undefined,
  }),
  subTaskResults: Annotation<SubTaskResult[]>({
    reducer: (prev: SubTaskResult[], next: SubTaskResult[]) => [...prev, ...next],
    default: () => [],
  }),
  guardrailedResults: Annotation<SubTaskResult[]>({
    reducer: (prev: SubTaskResult[], next: SubTaskResult[]) => [...prev, ...next],
    default: () => [],
  }),

  // ── Output fields ─────────────────────────────────────────────────────────
  report: Annotation<string>({
    reducer: (_prev: string, next: string) => next,
    default: () => '',
  }),
  guardrailSummary: Annotation<{ passed: number; flagged: number; blocked: number }>({
    reducer: (
      _prev: { passed: number; flagged: number; blocked: number },
      next: { passed: number; flagged: number; blocked: number }
    ) => next,
    default: () => ({ passed: 0, flagged: 0, blocked: 0 }),
  }),
  skillTrace: Annotation<string[]>({
    reducer: (prev: string[], next: string[]) => [...new Set([...prev, ...next])],
    default: () => [],
  }),

  // ── Metrics ───────────────────────────────────────────────────────────────
  totalInputTokens: Annotation<number>({
    reducer: (prev: number, next: number) => prev + next,
    default: () => 0,
  }),
  totalOutputTokens: Annotation<number>({
    reducer: (prev: number, next: number) => prev + next,
    default: () => 0,
  }),
  startTime: Annotation<number>({
    reducer: (prev: number, next: number) => prev || next,
    default: () => 0,
  }),
  durationMs: Annotation<number>({
    reducer: (_prev: number, next: number) => next,
    default: () => 0,
  }),
})

export type ThemisState = typeof ThemisAnnotation.State

export function getAnnotation() {
  return ThemisAnnotation
}
