// Mock all external dependencies
jest.mock('@/lib/themis/llm-factory', () => ({
  modelForTier: jest.fn().mockReturnValue({
    bindTools: jest.fn().mockReturnThis(),
    invoke: jest.fn().mockResolvedValue({ content: 'mocked response' }),
  }),
}))

jest.mock('@langchain/langgraph/prebuilt', () => ({
  createReactAgent: jest.fn().mockReturnValue({
    invoke: jest.fn().mockResolvedValue({
      messages: [{ content: 'agent findings result' }],
    }),
  }),
}))

jest.mock('@/lib/themis/decompose', () => ({
  decompose: jest.fn().mockResolvedValue([
    { id: 'st-1', description: 'Analyse recon', skill: 'mitre-attack', phase: 0, tier: 'fast', dependsOn: [] },
  ]),
}))

jest.mock('@/lib/themis/guardrail', () => ({
  applyGuardrail: jest.fn().mockImplementation((r: unknown) => Promise.resolve(r)),
}))

jest.mock('@/lib/themis/synthesise', () => ({
  synthesise: jest.fn().mockResolvedValue('Synthesised report'),
}))

jest.mock('@/lib/themis/index', () => ({ orchestrate: jest.fn() }))

// Debrief mock — prevents SQLite writes during node tests
jest.mock('@/lib/themis/debrief', () => ({
  writeDebrief: jest.fn(),
  closeDb: jest.fn(),
}))

import type { ThemisState } from '@/lib/themis/graph/state'
import { validateNode, decomposeNode, fanOutNode, skillAgentNode, guardrailNode, synthesiseNode, auditNode } from '@/lib/themis/graph/nodes'
import { Send } from '@langchain/langgraph'
import { decompose } from '@/lib/themis/decompose'
import { applyGuardrail } from '@/lib/themis/guardrail'
import { synthesise } from '@/lib/themis/synthesise'
import { writeDebrief } from '@/lib/themis/debrief'

function baseState(): Partial<ThemisState> {
  return {
    task: 'Assess web app for OWASP Top 10',
    context: { environments: ['web'], attackSurfaceTags: ['api'] },
    provider: 'anthropic',
    subTasks: [],
    subTaskResults: [],
    guardrailedResults: [],
    report: '',
    guardrailSummary: { passed: 0, flagged: 0, blocked: 0 },
    skillTrace: [],
    totalInputTokens: 0,
    totalOutputTokens: 0,
    startTime: Date.now(),
    durationMs: 0,
  }
}

describe('validateNode', () => {
  it('returns state unchanged for valid input', async () => {
    const state = baseState() as ThemisState
    const result = await validateNode(state)
    expect(result.task).toBe(state.task)
  })

  it('throws ValidationError for task exceeding 4000 chars', async () => {
    const state = { ...baseState(), task: 'x'.repeat(4001) } as ThemisState
    await expect(validateNode(state)).rejects.toThrow('Task exceeds')
  })
})

describe('decomposeNode', () => {
  it('returns subTasks from decompose()', async () => {
    const state = baseState() as ThemisState
    const result = await decomposeNode(state)
    expect(result.subTasks).toHaveLength(1)
    expect(result.subTasks![0].id).toBe('st-1')
  })
})

describe('fanOutNode', () => {
  it('returns one Send per subTask', () => {
    const state = {
      ...baseState(),
      subTasks: [
        { id: 'st-1', description: 'A', skill: 'mitre-attack', phase: 0, tier: 'fast', dependsOn: [] },
        { id: 'st-2', description: 'B', skill: 'threat-modeling', phase: 0, tier: 'fast', dependsOn: [] },
      ],
    } as ThemisState
    const sends = fanOutNode(state)
    expect(sends).toHaveLength(2)
    expect(sends[0]).toBeInstanceOf(Send)
    expect(sends[1]).toBeInstanceOf(Send)
  })
})

describe('skillAgentNode', () => {
  it('returns a subTaskResult for the currentSubTask', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
    const state = {
      ...baseState(),
      provider: 'anthropic' as const,
      currentSubTask: {
        id: 'st-1', description: 'Analyse recon', skill: 'mitre-attack', phase: 0, tier: 'fast', dependsOn: []
      },
    } as ThemisState
    const result = await skillAgentNode(state)
    expect(result.subTaskResults).toHaveLength(1)
    expect(result.subTaskResults![0].subTaskId).toBe('st-1')
    expect(result.subTaskResults![0].skill).toBe('mitre-attack')
  })

  it('returns low-confidence result when currentSubTask is undefined', async () => {
    const state = { ...baseState(), currentSubTask: undefined } as ThemisState
    const result = await skillAgentNode(state)
    expect(result.subTaskResults).toHaveLength(1)
    expect(result.subTaskResults![0].confidence).toBe('low')
  })
})

describe('guardrailNode', () => {
  it('calls applyGuardrail for each subTaskResult', async () => {
    const mockApplyGuardrail = applyGuardrail as jest.Mock
    mockApplyGuardrail.mockClear()
    const state = {
      ...baseState(),
      subTaskResults: [
        { subTaskId: 'st-1', skill: 'mitre-attack', findings: 'test', confidence: 'high', guardrail: 'PASS', inputTokens: 0, outputTokens: 0 },
      ],
    } as ThemisState
    await guardrailNode(state)
    expect(mockApplyGuardrail).toHaveBeenCalledTimes(1)
  })
})

describe('synthesiseNode', () => {
  it('calls synthesise with non-BLOCK results and returns report', async () => {
    const mockSynthesize = synthesise as jest.Mock
    mockSynthesize.mockClear()
    const state = {
      ...baseState(),
      guardrailedResults: [
        { subTaskId: 'st-1', skill: 'mitre-attack', findings: 'ok', confidence: 'high', guardrail: 'PASS', inputTokens: 5, outputTokens: 10 },
        { subTaskId: 'st-2', skill: 'threat-modeling', findings: 'blocked', confidence: 'high', guardrail: 'BLOCK', inputTokens: 2, outputTokens: 4 },
      ],
      task: 'Assess web app',
    } as ThemisState
    const result = await synthesiseNode(state)
    // Only PASS results passed to synthesise
    expect(mockSynthesize.mock.calls[0][1]).toHaveLength(1)
    expect(result.report).toBe('Synthesised report')
  })
})

describe('auditNode', () => {
  it('returns durationMs and does not throw', async () => {
    const state = {
      ...baseState(),
      startTime: Date.now() - 500,
      guardrailedResults: [],
      skillTrace: ['mitre-attack'],
      totalInputTokens: 100,
      totalOutputTokens: 200,
    } as ThemisState
    const result = await auditNode(state)
    expect(result.durationMs).toBeGreaterThan(0)
  })

  it('calls writeDebrief with metadata (not findings)', async () => {
    const mockWriteDebrief = writeDebrief as jest.Mock
    mockWriteDebrief.mockClear()
    const state = {
      ...baseState(),
      startTime: Date.now() - 300,
      guardrailedResults: [
        { subTaskId: 'st-1', skill: 'mitre-attack', findings: 'SECRET_FINDINGS', confidence: 'high', guardrail: 'PASS', inputTokens: 10, outputTokens: 20 },
      ],
      skillTrace: ['mitre-attack'],
      guardrailSummary: { passed: 1, flagged: 0, blocked: 0 },
    } as ThemisState
    await auditNode(state)
    expect(mockWriteDebrief).toHaveBeenCalledTimes(1)
    // Verify the call args do NOT contain findings text
    const callArg = mockWriteDebrief.mock.calls[0][0]
    expect(JSON.stringify(callArg)).not.toContain('SECRET_FINDINGS')
  })
})
