jest.mock('@/lib/themis/graph/index', () => ({
  getThemisGraph: jest.fn().mockResolvedValue({
    invoke: jest.fn().mockResolvedValue({
      task: 'test task',
      context: { environments: [], attackSurfaceTags: [] },
      subTasks: [{ id: 'st-1', description: 'A', skill: 'mitre-attack', phase: 0, tier: 'fast', dependsOn: [] }],
      subTaskResults: [
        { subTaskId: 'st-1', skill: 'mitre-attack', findings: 'recon findings', confidence: 'high', guardrail: 'PASS', inputTokens: 10, outputTokens: 20 },
      ],
      guardrailedResults: [
        { subTaskId: 'st-1', skill: 'mitre-attack', findings: 'recon findings', confidence: 'high', guardrail: 'PASS', inputTokens: 10, outputTokens: 20 },
      ],
      guardrailSummary: { passed: 1, flagged: 0, blocked: 0 },
      skillTrace: ['mitre-attack'],
      totalInputTokens: 10,
      totalOutputTokens: 20,
      report: 'Final report from graph',
      durationMs: 350,
    }),
  }),
}))

jest.mock('@/lib/themis/provider', () => ({
  availableProviders: jest.fn().mockReturnValue(['anthropic']),
}))

describe('orchestrate() (graph-backed)', () => {
  it('returns OrchestrateResponse with all required fields', async () => {
    const { orchestrate } = await import('@/lib/themis/index')
    const result = await orchestrate({
      task: 'Assess web app',
      context: { environments: ['web'], attackSurfaceTags: ['api'] },
      provider: 'anthropic',
    })
    expect(result.report).toBe('Final report from graph')
    expect(result.subTaskResults).toHaveLength(1)
    expect(result.guardrailSummary.passed).toBe(1)
    expect(result.skillTrace).toContain('mitre-attack')
    expect(typeof result.threadId).toBe('string')
    expect(result.durationMs).toBeGreaterThan(0)
  })

  it('throws ProviderUnavailableError when no providers configured', async () => {
    const { availableProviders } = await import('@/lib/themis/provider')
    ;(availableProviders as jest.Mock).mockReturnValueOnce([])
    const { ProviderUnavailableError } = await import('@/lib/themis/types')
    const { orchestrate } = await import('@/lib/themis/index')
    await expect(
      orchestrate({ task: 'test', context: { environments: [], attackSurfaceTags: [] } })
    ).rejects.toBeInstanceOf(ProviderUnavailableError)
  })
})
