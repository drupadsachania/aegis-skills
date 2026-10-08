import { ValidationError } from '@/lib/themis/types'

// Mock the provider module
jest.mock('@/lib/themis/provider', () => ({
  llm: jest.fn(),
}))

// Mock global fetch
const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

import { decompose } from '@/lib/themis/decompose'
import { llm } from '@/lib/themis/provider'

const mockLlm = llm as jest.MockedFunction<typeof llm>

const VALID_SUBTASK_ARRAY = [
  { id: 'st-1', description: 'Check auth', skill: 'auth-bypass', phase: 0, dependsOn: [] },
  { id: 'st-2', description: 'Check SQL', skill: 'sql-injection', phase: 1, dependsOn: ['st-1'] },
]

function makeSkillsResponse() {
  return {
    ok: true,
    json: () => Promise.resolve({
      skills: [
        { name: 'auth-bypass' },
        { name: 'sql-injection' },
        { name: 'xss-detection' },
      ],
    }),
  }
}

function makeLlmResponse(content: string) {
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
  mockFetch.mockResolvedValue(makeSkillsResponse())
})

describe('decompose', () => {
  test('parses SubTask array from LLM response', async () => {
    mockLlm.mockResolvedValue(await makeLlmResponse(JSON.stringify(VALID_SUBTASK_ARRAY)))

    const result = await decompose({
      task: 'Analyse the login system for vulnerabilities',
      context: { environments: ['web'], attackSurfaceTags: ['auth'] },
    })

    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('st-1')
    expect(result[0].skill).toBe('auth-bypass')
    expect(result[1].id).toBe('st-2')
  })

  test('assigns tier correctly: phase 0 (1 phase) → fast', async () => {
    const tasks = [{ id: 'st-1', description: 'test', skill: 'auth-bypass', phase: 0, dependsOn: [] }]
    mockLlm.mockResolvedValue(await makeLlmResponse(JSON.stringify(tasks)))

    const result = await decompose({
      task: 'Analyse login',
      context: { environments: [], attackSurfaceTags: [] },
    })
    // phase 0 → phases = 0+1 = 1 → ≤2 → fast
    expect(result[0].tier).toBe('fast')
  })

  test('assigns tier correctly: phase 1 (2 phases) → fast', async () => {
    const tasks = [{ id: 'st-1', description: 'test', skill: 'auth-bypass', phase: 1, dependsOn: [] }]
    mockLlm.mockResolvedValue(await makeLlmResponse(JSON.stringify(tasks)))

    const result = await decompose({
      task: 'Analyse login',
      context: { environments: [], attackSurfaceTags: [] },
    })
    // phase 1 → phases = 1+1 = 2 → ≤2 → fast
    expect(result[0].tier).toBe('fast')
  })

  test('assigns tier correctly: phase 2 (3 phases) → standard', async () => {
    const tasks = [{ id: 'st-1', description: 'test', skill: 'auth-bypass', phase: 2, dependsOn: [] }]
    mockLlm.mockResolvedValue(await makeLlmResponse(JSON.stringify(tasks)))

    const result = await decompose({
      task: 'Analyse login',
      context: { environments: [], attackSurfaceTags: [] },
    })
    // phase 2 → phases = 2+1 = 3 → ≤5 → standard
    expect(result[0].tier).toBe('standard')
  })

  test('assigns tier correctly: phase 5 (6 phases) → power', async () => {
    const tasks = [{ id: 'st-1', description: 'test', skill: 'auth-bypass', phase: 5, dependsOn: [] }]
    mockLlm.mockResolvedValue(await makeLlmResponse(JSON.stringify(tasks)))

    const result = await decompose({
      task: 'Analyse login',
      context: { environments: [], attackSurfaceTags: [] },
    })
    // phase 5 → phases = 5+1 = 6 → >5 → power
    expect(result[0].tier).toBe('power')
  })

  test('retries exactly once if JSON.parse fails on first attempt', async () => {
    // First call returns invalid JSON, second returns valid
    mockLlm
      .mockResolvedValueOnce({
        content: 'not valid json !!!',
        model: 'test',
        provider: 'anthropic',
        inputTokens: 5,
        outputTokens: 5,
        latencyMs: 10,
      })
      .mockResolvedValueOnce({
        content: JSON.stringify(VALID_SUBTASK_ARRAY),
        model: 'test',
        provider: 'anthropic',
        inputTokens: 5,
        outputTokens: 5,
        latencyMs: 10,
      })

    const result = await decompose({
      task: 'Analyse the login system',
      context: { environments: [], attackSurfaceTags: [] },
    })

    expect(mockLlm).toHaveBeenCalledTimes(2)
    expect(result).toHaveLength(2)
  })

  test('throws after two failures', async () => {
    mockLlm.mockResolvedValue({
      content: 'not json at all',
      model: 'test',
      provider: 'anthropic',
      inputTokens: 5,
      outputTokens: 5,
      latencyMs: 10,
    })

    await expect(
      decompose({
        task: 'Analyse the login system',
        context: { environments: [], attackSurfaceTags: [] },
      })
    ).rejects.toThrow('Decompose failed after retry')

    expect(mockLlm).toHaveBeenCalledTimes(2)
  })

  test('propagates ValidationError from sanitiseTask when task > 4000 chars', async () => {
    const longTask = 'a'.repeat(4001)
    await expect(
      decompose({
        task: longTask,
        context: { environments: [], attackSurfaceTags: [] },
      })
    ).rejects.toThrow(ValidationError)

    // LLM should not have been called
    expect(mockLlm).not.toHaveBeenCalled()
  })

  test('throws if skill list fetch fails', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: () => Promise.resolve({}) })

    await expect(
      decompose({
        task: 'Analyse login',
        context: { environments: [], attackSurfaceTags: [] },
      })
    ).rejects.toThrow()
  })

  test('throws if fetch itself throws', async () => {
    mockFetch.mockRejectedValue(new Error('network error'))

    await expect(
      decompose({
        task: 'Analyse login',
        context: { environments: [], attackSurfaceTags: [] },
      })
    ).rejects.toThrow()
  })

  test('includes dependsOn array from LLM response', async () => {
    mockLlm.mockResolvedValue({
      content: JSON.stringify(VALID_SUBTASK_ARRAY),
      model: 'test',
      provider: 'anthropic',
      inputTokens: 5,
      outputTokens: 5,
      latencyMs: 10,
    })

    const result = await decompose({
      task: 'Analyse login',
      context: { environments: [], attackSurfaceTags: [] },
    })

    expect(result[0].dependsOn).toEqual([])
    expect(result[1].dependsOn).toEqual(['st-1'])
  })
})
