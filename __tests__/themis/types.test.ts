import type { OrchestrateRequest, OrchestrateResponse } from '@/lib/themis/types'

describe('OrchestrateRequest threadId field', () => {
  it('accepts threadId as an optional string', () => {
    // Explicit type annotation: TypeScript will error if threadId is removed from OrchestrateRequest
    const req: OrchestrateRequest = {
      task: 'test task',
      context: { environments: [], attackSurfaceTags: [] },
      threadId: 'abc-123',
    }
    expect(req.threadId).toBe('abc-123')
  })

  it('accepts OrchestrateRequest without threadId (optional)', () => {
    // threadId is optional — no TypeScript error when omitted
    const req: OrchestrateRequest = {
      task: 'test task',
      context: { environments: [], attackSurfaceTags: [] },
    }
    expect(req.threadId).toBeUndefined()
  })

  it('OrchestrateResponse includes threadId field', () => {
    // Explicit type annotation: TypeScript will error if threadId is removed from OrchestrateResponse
    const resp: OrchestrateResponse = {
      report: 'r',
      subTaskResults: [],
      guardrailSummary: { passed: 0, flagged: 0, blocked: 0 },
      skillTrace: [],
      totalInputTokens: 0,
      totalOutputTokens: 0,
      durationMs: 0,
      threadId: 'abc-123',
    }
    expect(resp.threadId).toBe('abc-123')
  })
})
