// Full-graph smoke test with all external calls mocked

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
  decompose: jest.fn().mockResolvedValue([
    { id: 'st-1', description: 'Recon analysis', skill: 'mitre-attack', phase: 0, tier: 'fast', dependsOn: [] },
  ]),
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

describe('themisGraph', () => {
  it('compiles without error', async () => {
    const { buildThemisGraph } = await import('@/lib/themis/graph/index')
    const graph = await buildThemisGraph()
    expect(graph).toBeDefined()
    expect(typeof graph.invoke).toBe('function')
  })

  it('invoke() returns a final state with report and guardrailSummary', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
    const { buildThemisGraph } = await import('@/lib/themis/graph/index')
    const graph = await buildThemisGraph()

    const result = await graph.invoke(
      {
        task: 'Assess web app for OWASP Top 10',
        context: { environments: ['web'], attackSurfaceTags: ['api'] },
        provider: 'anthropic',
      },
      { configurable: { thread_id: 'test-thread-001' } }
    )

    expect(result.report).toBe('Final security report')
    expect(result.guardrailSummary).toBeDefined()
    expect(result.subTaskResults).toHaveLength(1)
  })

  it('invoke() with invalid task throws ValidationError', async () => {
    const { buildThemisGraph } = await import('@/lib/themis/graph/index')
    const graph = await buildThemisGraph()
    await expect(
      graph.invoke(
        { task: '<script>xss</script>', context: { environments: [], attackSurfaceTags: [] } },
        { configurable: { thread_id: 'test-thread-002' } }
      )
    ).rejects.toThrow()
  })
})
