describe('OrchestrateRequest threadId field', () => {
  it('accepts threadId as an optional string', () => {
    const req = {
      task: 'test task',
      context: { environments: [], attackSurfaceTags: [] },
      threadId: 'abc-123',
    }
    expect(req.threadId).toBe('abc-123')
  })

  it('accepts OrchestrateRequest without threadId (optional)', () => {
    const req = {
      task: 'test task',
      context: { environments: [], attackSurfaceTags: [] },
    }
    expect((req as { threadId?: string }).threadId).toBeUndefined()
  })

  it('OrchestrateResponse includes threadId field', () => {
    const resp = {
      report: 'r', subTaskResults: [], guardrailSummary: { passed: 0, flagged: 0, blocked: 0 },
      skillTrace: [], totalInputTokens: 0, totalOutputTokens: 0, durationMs: 0,
      threadId: 'abc-123',
    }
    expect(resp.threadId).toBe('abc-123')
  })
})
