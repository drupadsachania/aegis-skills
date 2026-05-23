// Mock the provider module
jest.mock('@/lib/themis/provider', () => ({
  llm: jest.fn(),
}))

// Mock global fetch for phase content
const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

import { dispatch } from '@/lib/themis/dispatch'
import { llm } from '@/lib/themis/provider'
import { SubTask } from '@/lib/themis/types'

const mockLlm = llm as jest.MockedFunction<typeof llm>

function makeSubTask(overrides: Partial<SubTask> = {}): SubTask {
  return {
    id: 'st-1',
    description: 'Check authentication',
    skill: 'auth-bypass',
    phase: 0,
    tier: 'fast',
    dependsOn: [],
    ...overrides,
  }
}

function makeGoodPhaseResponse() {
  return {
    ok: true,
    text: () => Promise.resolve('You are a security analyst. Analyse auth issues.'),
  }
}

function makeLlmResult(content = 'Analysis complete: no issues found') {
  return Promise.resolve({
    content,
    model: 'claude-haiku-4-5-20251001',
    provider: 'anthropic' as const,
    inputTokens: 10,
    outputTokens: 20,
    latencyMs: 100,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockFetch.mockResolvedValue(makeGoodPhaseResponse())
  mockLlm.mockImplementation(() => makeLlmResult())
})

describe('dispatch', () => {
  test('runs independent tasks (dependsOn: []) in parallel using Promise.allSettled pattern', async () => {
    const tasks: SubTask[] = [
      makeSubTask({ id: 'st-1', dependsOn: [] }),
      makeSubTask({ id: 'st-2', skill: 'sql-injection', dependsOn: [] }),
      makeSubTask({ id: 'st-3', skill: 'xss-detection', dependsOn: [] }),
    ]

    const results = await dispatch(tasks)

    // All three tasks should have been executed (llm called 3 times)
    expect(mockLlm).toHaveBeenCalledTimes(3)
    expect(results).toHaveLength(3)
    expect(results[0].confidence).toBe('high')
    expect(results[1].confidence).toBe('high')
    expect(results[2].confidence).toBe('high')
  })

  test('runs dependent tasks after their dependency resolves', async () => {
    const order: string[] = []

    mockLlm.mockImplementation(async (req) => {
      // Track which task was called based on the user message content
      order.push(req.userMessage)
      return makeLlmResult()
    })

    const tasks: SubTask[] = [
      makeSubTask({ id: 'st-1', description: 'first task', dependsOn: [] }),
      makeSubTask({ id: 'st-2', description: 'second task depends on first', dependsOn: ['st-1'] }),
    ]

    const results = await dispatch(tasks)

    expect(results).toHaveLength(2)
    expect(results[0].subTaskId).toBe('st-1')
    expect(results[1].subTaskId).toBe('st-2')
    // Both should be high confidence (dependency succeeded)
    expect(results[0].confidence).toBe('high')
    expect(results[1].confidence).toBe('high')
    // st-1 must have been called before st-2
    expect(order[0]).toContain('first task')
    expect(order[1]).toContain('second task')
  })

  test('skips dependent task if dependency has confidence: low failure', async () => {
    // Make fetch fail so the first task returns low confidence
    mockFetch.mockResolvedValue({ ok: false, text: () => Promise.resolve('') })

    const tasks: SubTask[] = [
      makeSubTask({ id: 'st-1', dependsOn: [] }),
      makeSubTask({ id: 'st-2', skill: 'sql-injection', dependsOn: ['st-1'] }),
    ]

    const results = await dispatch(tasks)

    expect(results).toHaveLength(2)
    expect(results[0].confidence).toBe('low')
    // st-2 should be skipped with low confidence
    expect(results[1].confidence).toBe('low')
    expect(results[1].findings).toContain('skipped')
    // LLM should not have been called for the dependent task
    expect(mockLlm).not.toHaveBeenCalled()
  })

  test('returns low-confidence failure (not exception) when skill phase content contains <script', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<script>alert("xss")</script> injected content'),
    })

    const tasks = [makeSubTask()]
    const results = await dispatch(tasks)

    expect(results[0].confidence).toBe('low')
    expect(results[0].findings).toContain('integrity check')
    // LLM should not have been called
    expect(mockLlm).not.toHaveBeenCalled()
  })

  test('returns low-confidence failure (not exception) when skill phase content > 8000 chars', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('a'.repeat(8001)),
    })

    const tasks = [makeSubTask()]
    const results = await dispatch(tasks)

    expect(results[0].confidence).toBe('low')
    expect(results[0].findings).toContain('integrity check')
    expect(mockLlm).not.toHaveBeenCalled()
  })

  test('returns low-confidence failure when LLM call fails (not exception)', async () => {
    mockLlm.mockRejectedValue(new Error('LLM connection timeout'))

    const tasks = [makeSubTask()]
    const results = await dispatch(tasks)

    // Should not throw — should return low-confidence result
    expect(results[0].confidence).toBe('low')
    expect(results[0].findings).toContain('could not be completed')
  })

  test('returns correct subTaskId in results', async () => {
    const tasks = [makeSubTask({ id: 'st-42' })]
    const results = await dispatch(tasks)
    expect(results[0].subTaskId).toBe('st-42')
  })

  test('returns correct skill in results', async () => {
    const tasks = [makeSubTask({ skill: 'xss-detection' })]
    const results = await dispatch(tasks)
    expect(results[0].skill).toBe('xss-detection')
  })

  test('handles empty task list', async () => {
    const results = await dispatch([])
    expect(results).toEqual([])
  })

  test('phase content with javascript: returns low-confidence failure', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('javascript:void(0) embedded in content'),
    })

    const tasks = [makeSubTask()]
    const results = await dispatch(tasks)

    expect(results[0].confidence).toBe('low')
    expect(mockLlm).not.toHaveBeenCalled()
  })
})
