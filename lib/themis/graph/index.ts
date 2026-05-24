import { StateGraph, START, END } from '@langchain/langgraph'
import { ThemisAnnotation } from './state'
import {
  validateNode,
  decomposeNode,
  fanOutNode,
  skillAgentNode,
  guardrailNode,
  synthesiseNode,
  auditNode,
} from './nodes'
import { getCheckpointer } from '../checkpointer'

/**
 * buildThemisGraph
 *
 * Constructs and compiles the Themis LangGraph StateGraph.
 *
 * Graph topology:
 *
 *   START → validate → decompose → [fan-out via Send API]
 *                                       ↓ (parallel)
 *                               skill-agent (×N, one per SubTask)
 *                                       ↓ (all complete before next step)
 *                               guardrail → synthesise → audit → END
 *
 * Fan-out uses LangGraph's Send API: fanOutNode returns Send[] wired as
 * a conditional edge from decompose. LangGraph dispatches all Sends in
 * parallel and waits for them all before proceeding to guardrail.
 *
 * State persistence: getCheckpointer() returns MemorySaver (in-RAM only).
 * Graph state never leaves the process.
 *
 * LangSmith tracing is automatic when LANGCHAIN_TRACING_V2=true.
 */
export async function buildThemisGraph() {
  const checkpointer = await getCheckpointer()

  const graph = new StateGraph(ThemisAnnotation)
    .addNode('validate', validateNode)
    .addNode('decompose', decomposeNode)
    .addNode('skill-agent', skillAgentNode)
    .addNode('guardrail', guardrailNode)
    .addNode('synthesise', synthesiseNode)
    .addNode('audit', auditNode)

    .addEdge(START, 'validate')
    .addEdge('validate', 'decompose')
    // Fan-out: fanOutNode returns Send[] — LangGraph runs them in parallel
    .addConditionalEdges('decompose', fanOutNode, ['skill-agent'])
    .addEdge('skill-agent', 'guardrail')
    .addEdge('guardrail', 'synthesise')
    .addEdge('synthesise', 'audit')
    .addEdge('audit', END)

  return graph.compile({ checkpointer })
}

// Singleton — built once per server process, reused across requests
let _graphPromise: ReturnType<typeof buildThemisGraph> | null = null

export function getThemisGraph() {
  if (!_graphPromise) {
    _graphPromise = buildThemisGraph()
  }
  return _graphPromise
}
