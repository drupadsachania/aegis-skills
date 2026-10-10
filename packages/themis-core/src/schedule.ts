// Dependency-aware staged scheduling — the exact semantics of the LangGraph
// fanOutNode router, as a pure function both modes share.
import type { SubTask, SubTaskResult } from './types'

export type ScheduleDecision = { kind: 'dispatch'; ready: SubTask[] } | { kind: 'complete' }

export function scheduleStage(subTasks: SubTask[], results: Pick<SubTaskResult, 'subTaskId'>[]): ScheduleDecision {
  const done = new Set(results.map((r) => r.subTaskId))
  const pending = subTasks.filter((t) => !done.has(t.id))
  if (pending.length === 0) return { kind: 'complete' }
  let ready = pending.filter((t) => t.dependsOn.every((d) => done.has(d)))
  // normaliseSubTasks guarantees an acyclic plan; this release only exists so a
  // malformed plan can never stall the run.
  if (ready.length === 0) ready = pending
  return { kind: 'dispatch', ready }
}

export function readySubTasks(run: { subTasks: SubTask[]; results: Pick<SubTaskResult, 'subTaskId'>[] }): SubTask[] {
  const s = scheduleStage(run.subTasks, run.results)
  return s.kind === 'dispatch' ? s.ready : []
}
