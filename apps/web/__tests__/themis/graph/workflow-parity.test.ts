// Graph topology parity: the hand-written LangGraph must have exactly the
// transitions of THEMIS_WORKFLOW (until Phase 4 builds the graph from it).
import type { StepId } from '@aegis-skills/themis-core'

jest.mock('@/lib/themis/llm-factory', () => ({
  modelForTier: jest.fn().mockReturnValue({ invoke: jest.fn() }),
}))

jest.mock('@langchain/langgraph/prebuilt', () => ({
  createReactAgent: jest.fn().mockReturnValue({
    invoke: jest.fn().mockResolvedValue({
      messages: [{ content: 'mocked agent findings' }],
    }),
  }),
}))

jest.mock('@/lib/themis/decompose', () => ({
  decompose: jest.fn().mockResolvedValue([]),
}))

jest.mock('@/lib/themis/guardrail', () => ({
  applyGuardrail: jest.fn().mockImplementation((r: unknown) => Promise.resolve(r)),
}))

jest.mock('@/lib/themis/synthesise', () => ({
  synthesise: jest.fn().mockResolvedValue('Final security report'),
}))

jest.mock('@/lib/themis/checkpointer', () => ({
  getCheckpointer: jest.fn().mockResolvedValue(
    new (require('@langchain/langgraph').MemorySaver)()
  ),
}))

jest.mock('@/lib/themis/debrief', () => ({
  writeDebrief: jest.fn(),
  closeDb: jest.fn(),
}))

jest.mock('@/lib/skill-reader', () => ({
  getPhaseContent: jest.fn().mockResolvedValue('## Skill phase content'),
}))

import { THEMIS_WORKFLOW, LANGGRAPH_NODE_BY_STEP } from '@aegis-skills/themis-core'

it('LangGraph edges equal THEMIS_WORKFLOW transitions', async () => {
  const { buildThemisGraph } = await import('@/lib/themis/graph/index')
  const graph = await buildThemisGraph()
  const drawn = await graph.getGraph()
  const actual = new Set((drawn.edges as Array<{ source: string; target: string }>).map((e) => `${e.source}->${e.target}`))
  const node = (s: StepId) => LANGGRAPH_NODE_BY_STEP[s]
  const expected = new Set<string>([`__start__->${node(THEMIS_WORKFLOW.start)}`])
  for (const def of Object.values(THEMIS_WORKFLOW.steps)) {
    if (def.next.length === 0) expected.add(`${node(def.id)}->__end__`)
    for (const n of def.next) expected.add(`${node(def.id)}->${node(n)}`)
  }
  expect([...actual].sort()).toEqual([...expected].sort())
})
