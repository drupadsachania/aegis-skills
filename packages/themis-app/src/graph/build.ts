import { StateGraph, START, END } from '@langchain/langgraph'
import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint'
import { THEMIS_WORKFLOW, LANGGRAPH_NODE_BY_STEP, type StepId } from '@aegis-skills/themis-core'
import { ThemisAnnotation, type ThemisState } from './state'
import { STEP_IMPLS, makeRouter, type StepContext } from './steps'

/** Termination bound only: two supersteps per stage, ≤ MAX_SUBTASKS stages, plus fixed steps. */
export const THEMIS_RECURSION_LIMIT = 50

type Workflow = typeof THEMIS_WORKFLOW
type NodeMap = Readonly<Record<StepId, string>>
export interface EdgeSpec { from: string; to: string[]; conditional: boolean }

/** Pure: the exact edges the builder wires, derived from the workflow data. */
export function edgesFor(wf: Workflow = THEMIS_WORKFLOW, nodes: NodeMap = LANGGRAPH_NODE_BY_STEP): EdgeSpec[] {
  const edges: EdgeSpec[] = [{ from: START, to: [nodes[wf.start]], conditional: false }]
  for (const id of Object.keys(wf.steps) as StepId[]) {
    const next = wf.steps[id].next
    if (next.length > 1 && !next.includes('fanout')) throw new Error(`Unsupported branching at step "${id}"`)
    edges.push({ from: nodes[id], to: next.length === 0 ? [END] : next.map((n) => nodes[n]), conditional: next.length > 1 })
  }
  if (edges.filter((e) => e.conditional).length !== 1) throw new Error('Expected exactly one branching step')
  return edges
}

export interface GraphSnapshot { values: Record<string, unknown>; next: string[]; tasks: Array<{ interrupts: unknown[] }> }
export interface CompiledThemisGraph {
  invoke(input: unknown, config: Record<string, unknown>): Promise<unknown>
  getState(config: Record<string, unknown>): Promise<GraphSnapshot>
}
interface LooseGraph {
  addNode(name: string, fn: (s: ThemisState) => Promise<Partial<ThemisState>>): LooseGraph
  addEdge(from: string, to: string): LooseGraph
  addConditionalEdges(from: string, router: unknown, to: string[]): LooseGraph
  compile(o: { checkpointer: BaseCheckpointSaver }): CompiledThemisGraph
}

/** Replaces the hand-written apps/web graph: topology comes only from THEMIS_WORKFLOW. */
export function buildThemisGraph(ctx: StepContext, checkpointer: BaseCheckpointSaver, wf: Workflow = THEMIS_WORKFLOW, nodes: NodeMap = LANGGRAPH_NODE_BY_STEP): CompiledThemisGraph {
  const edges = edgesFor(wf, nodes)
  let g = new StateGraph(ThemisAnnotation) as unknown as LooseGraph
  for (const id of Object.keys(wf.steps) as StepId[]) {
    const impl = STEP_IMPLS[id]
    g = g.addNode(nodes[id], async (state) => {
      if (id !== 'fanout') ctx.events.emit(state.runId, { type: 'step', step: id, status: 'started' })
      return impl(state, ctx) // GraphInterrupt from interrupt() propagates untouched
    })
  }
  for (const e of edges) {
    if (e.conditional) {
      const exit = e.to.find((n) => n !== nodes.fanout) as string
      g = g.addConditionalEdges(e.from, makeRouter(ctx, nodes.fanout, exit), e.to)
    } else {
      g = g.addEdge(e.from, e.to[0])
    }
  }
  return g.compile({ checkpointer })
}
