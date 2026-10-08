import { StateGraph, START, END } from '@langchain/langgraph'
import { ThemisAnnotation } from './state'
import {
  validateNode,
  decomposeNode,
  scheduleNode,
  fanOutNode,
  skillAgentNode,
  guardrailNode,
  synthesiseNode,
  auditNode,
} from './nodes'
import { getCheckpointer } from '../checkpointer'

/**
 * Upper bound on graph supersteps for one run. Staged execution costs two
 * steps per stage (skill-agent + schedule); with at most MAX_SUBTASKS stages
 * plus the fixed nodes this stays well under the limit, which only exists to
 * guarantee termination.
 */
export const THEMIS_RECURSION_LIMIT = 50

/**
 * buildThemisGraph
 *
 * Graph topology:
 *
 *   START → validate → decompose → schedule ─┬─► [Send] skill-agent (×ready, parallel)
 *                                     ▲      │              │
 *                                     └──────┼──────────────┘   (next stage)
 *                                            └─► guardrail → synthesise → audit → END
 *
 * schedule routes via fanOutNode: it dispatches every sub-task whose
 * dependencies have completed, loops back after each stage, and moves on to
 * guardrail once nothing is pending. Dependent sub-tasks therefore run after
 * the work they depend on and can read it via read_findings.
 */
export async function buildThemisGraph() {
  const checkpointer = await getCheckpointer()

  const graph = new StateGraph(ThemisAnnotation)
    .addNode('validate', validateNode)
    .addNode('decompose', decomposeNode)
    .addNode('schedule', scheduleNode)
    .addNode('skill-agent', skillAgentNode)
    .addNode('guardrail', guardrailNode)
    .addNode('synthesise', synthesiseNode)
    .addNode('audit', auditNode)

    .addEdge(START, 'validate')
    .addEdge('validate', 'decompose')
    .addEdge('decompose', 'schedule')
    .addConditionalEdges('schedule', fanOutNode, ['skill-agent', 'guardrail'])
    .addEdge('skill-agent', 'schedule')
    .addEdge('guardrail', 'synthesise')
    .addEdge('synthesise', 'audit')
    .addEdge('audit', END)

  return graph.compile({ checkpointer })
}

/**
 * Returns a freshly compiled graph — deliberately NOT a process-wide singleton.
 *
 * Each request gets its own graph and therefore its own MemorySaver, so run
 * state can never be read or resumed by another request (previously a shared
 * saver plus a client-supplied threadId let two callers collide on the same
 * thread, and checkpoints accumulated for the life of the process). Compiling
 * is cheap: no network, no model calls.
 */
export function getThemisGraph() {
  return buildThemisGraph()
}
