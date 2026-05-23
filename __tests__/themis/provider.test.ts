/**
 * provider.test.ts
 *
 * Tests for availableProviders() and llm() from lib/themis/provider.
 *
 * The provider uses dynamic imports (await import('...')), which Jest intercepts.
 * jest.mock() factories are hoisted before ALL variable declarations, so we cannot
 * reference file-scope vars from inside factories.  Instead, each factory defines
 * the mock inline, and we retrieve mock references after the fact with
 * jest.requireMock().
 */

// ──────────────────────────────────────────────────────────────
// Module-level mocks — factories are entirely self-contained
// ──────────────────────────────────────────────────────────────

jest.mock('@anthropic-ai/sdk', () => {
  const createFn = jest.fn()
  const Ctor = jest.fn(() => ({ messages: { create: createFn } }))
  ;(Ctor as unknown as Record<string, unknown>).__create = createFn
  // __esModule: true tells next/jest not to re-wrap the default export
  return { __esModule: true, default: Ctor }
})

jest.mock('openai', () => {
  const createFn = jest.fn()
  const Ctor = jest.fn(() => ({ chat: { completions: { create: createFn } } }))
  ;(Ctor as unknown as Record<string, unknown>).__create = createFn
  return { __esModule: true, default: Ctor }
})

jest.mock('@google/generative-ai', () => {
  const generateFn = jest.fn()
  const getModelFn = jest.fn(() => ({ generateContent: generateFn }))
  const Ctor = jest.fn(() => ({ getGenerativeModel: getModelFn }))
  ;(Ctor as unknown as Record<string, unknown>).__generateFn = generateFn
  ;(Ctor as unknown as Record<string, unknown>).__getModelFn = getModelFn
  return { __esModule: true, GoogleGenerativeAI: Ctor }
})

// ──────────────────────────────────────────────────────────────
// Import the module under test AFTER mocks are registered
// ──────────────────────────────────────────────────────────────

import { availableProviders, llm } from '@/lib/themis/provider'

// ──────────────────────────────────────────────────────────────
// Retrieve mock refs via jest.requireMock (safe after import)
// ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnthropicCtor = jest.requireMock('@anthropic-ai/sdk').default as jest.Mock & { __create: jest.Mock }
const anthropicCreate: jest.Mock = AnthropicCtor.__create

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const OpenAICtor = jest.requireMock('openai').default as jest.Mock & { __create: jest.Mock }
const openAICreate: jest.Mock = OpenAICtor.__create

const { GoogleGenerativeAI } = jest.requireMock('@google/generative-ai') as {
  GoogleGenerativeAI: jest.Mock & { __generateFn: jest.Mock; __getModelFn: jest.Mock }
}
const googleGenerateFn: jest.Mock = GoogleGenerativeAI.__generateFn
const googleGetModelFn: jest.Mock = GoogleGenerativeAI.__getModelFn

// ──────────────────────────────────────────────────────────────
// Default response fixtures
// ──────────────────────────────────────────────────────────────

const ANTHROPIC_GOOD = {
  content: [{ type: 'text', text: 'mock anthropic response' }],
  usage: { input_tokens: 10, output_tokens: 20 },
}

const OPENAI_GOOD = {
  choices: [{ message: { content: 'mock openai response' } }],
  usage: { prompt_tokens: 15, completion_tokens: 25 },
}

const GOOGLE_GOOD = {
  response: {
    text: () => 'mock google response',
    usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 22 },
  },
}

const BASE_REQUEST = {
  systemPrompt: 'You are a security analyst.',
  userMessage: 'Analyse this endpoint.',
  maxTokens: 512,
  temperature: 0.3,
}

// ──────────────────────────────────────────────────────────────
// Setup / teardown
// ──────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  // Re-apply implementations cleared by jest.clearAllMocks()
  anthropicCreate.mockResolvedValue(ANTHROPIC_GOOD)
  AnthropicCtor.mockImplementation(() => ({ messages: { create: anthropicCreate } }))

  openAICreate.mockResolvedValue(OPENAI_GOOD)
  OpenAICtor.mockImplementation(() => ({ chat: { completions: { create: openAICreate } } }))

  googleGenerateFn.mockResolvedValue(GOOGLE_GOOD)
  googleGetModelFn.mockReturnValue({ generateContent: googleGenerateFn })
  GoogleGenerativeAI.mockImplementation(() => ({ getGenerativeModel: googleGetModelFn }))

  // Clear all API keys
  delete process.env.ANTHROPIC_API_KEY
  delete process.env.OPENAI_API_KEY
  delete process.env.GOOGLE_API_KEY
})

// ──────────────────────────────────────────────────────────────
// availableProviders()
// ──────────────────────────────────────────────────────────────

describe('availableProviders', () => {
  test('returns [anthropic] when only ANTHROPIC_API_KEY is set', () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    expect(availableProviders()).toEqual(['anthropic'])
  })

  test('returns [] when no keys are set', () => {
    expect(availableProviders()).toEqual([])
  })

  test('returns multiple providers when multiple keys set', () => {
    process.env.ANTHROPIC_API_KEY = 'anthro-key'
    process.env.OPENAI_API_KEY = 'openai-key'
    process.env.GOOGLE_API_KEY = 'google-key'
    const providers = availableProviders()
    expect(providers).toContain('anthropic')
    expect(providers).toContain('openai')
    expect(providers).toContain('google')
    expect(providers).toHaveLength(3)
  })

  test('returns [openai] when only OPENAI_API_KEY is set', () => {
    process.env.OPENAI_API_KEY = 'openai-key'
    expect(availableProviders()).toEqual(['openai'])
  })

  test('returns [google] when only GOOGLE_API_KEY is set', () => {
    process.env.GOOGLE_API_KEY = 'google-key'
    expect(availableProviders()).toEqual(['google'])
  })
})

// ──────────────────────────────────────────────────────────────
// llm() — model selection per tier per provider
// ──────────────────────────────────────────────────────────────

describe('llm model selection', () => {
  test('anthropic fast → claude-haiku-4-5-20251001', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'

    await llm({ ...BASE_REQUEST, tier: 'fast', provider: 'anthropic' })

    expect(anthropicCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-haiku-4-5-20251001' })
    )
  })

  test('anthropic standard → claude-sonnet-4-6', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'

    await llm({ ...BASE_REQUEST, tier: 'standard', provider: 'anthropic' })

    expect(anthropicCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-sonnet-4-6' })
    )
  })

  test('openai fast → gpt-4o-mini', async () => {
    process.env.OPENAI_API_KEY = 'test-key'

    await llm({ ...BASE_REQUEST, tier: 'fast', provider: 'openai' })

    expect(openAICreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o-mini' })
    )
  })

  test('google standard → gemini-2.5-pro', async () => {
    process.env.GOOGLE_API_KEY = 'test-key'

    await llm({ ...BASE_REQUEST, tier: 'standard', provider: 'google' })

    expect(googleGetModelFn).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gemini-2.5-pro' })
    )
  })
})

// ──────────────────────────────────────────────────────────────
// llm() — ProviderUnavailableError
// ──────────────────────────────────────────────────────────────

describe('llm error handling', () => {
  test('throws with message "AI providers unavailable" when provider has no API key', async () => {
    await expect(
      llm({ ...BASE_REQUEST, tier: 'fast', provider: 'anthropic' })
    ).rejects.toThrow('AI providers unavailable')
  })

  test('thrown error has name ProviderUnavailableError when no key configured', async () => {
    let caught: unknown
    try {
      await llm({ ...BASE_REQUEST, tier: 'fast', provider: 'anthropic' })
    } catch (e) {
      caught = e
    }
    expect(caught).toBeDefined()
    expect((caught as Error).name).toBe('ProviderUnavailableError')
  })

  test('throws when no keys configured and no provider specified', async () => {
    await expect(
      llm({ ...BASE_REQUEST, tier: 'fast' })
    ).rejects.toThrow('AI providers unavailable')
  })
})

// ──────────────────────────────────────────────────────────────
// llm() — OpenAI o1: system prompt prepended to user message
// ──────────────────────────────────────────────────────────────

describe('llm openai o1 model system prompt handling', () => {
  test('for o1 model (power tier): system prompt is prepended to user message', async () => {
    process.env.OPENAI_API_KEY = 'test-key'

    await llm({
      systemPrompt: 'THE_SYSTEM_PROMPT',
      userMessage: 'THE_USER_MESSAGE',
      maxTokens: 100,
      temperature: 0.5,
      tier: 'power', // power → 'o1' for openai
      provider: 'openai',
    })

    const callArgs = openAICreate.mock.calls[0][0]
    expect(callArgs.messages).toHaveLength(1)
    expect(callArgs.messages[0].role).toBe('user')
    expect(callArgs.messages[0].content).toContain('THE_SYSTEM_PROMPT')
    expect(callArgs.messages[0].content).toContain('THE_USER_MESSAGE')
    const systemMsg = callArgs.messages.find((m: { role: string }) => m.role === 'system')
    expect(systemMsg).toBeUndefined()
  })

  test('for non-o1 openai model (fast tier): system prompt is separate system message', async () => {
    process.env.OPENAI_API_KEY = 'test-key'

    await llm({
      systemPrompt: 'MY_SYSTEM',
      userMessage: 'MY_USER',
      maxTokens: 100,
      temperature: 0.5,
      tier: 'fast', // fast → gpt-4o-mini
      provider: 'openai',
    })

    const callArgs = openAICreate.mock.calls[0][0]
    expect(callArgs.messages).toHaveLength(2)
    expect(callArgs.messages[0].role).toBe('system')
    expect(callArgs.messages[0].content).toBe('MY_SYSTEM')
    expect(callArgs.messages[1].role).toBe('user')
    expect(callArgs.messages[1].content).toBe('MY_USER')
  })
})

// ──────────────────────────────────────────────────────────────
// llm() — secret redaction in response content
// ──────────────────────────────────────────────────────────────

describe('llm secret redaction in response', () => {
  test('calls redactSecrets on response content — AWS key appears as [REDACTED]', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    const awsKey = 'AKIAIOSFODNN7EXAMPLE'
    anthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: `Found key: ${awsKey} in config file` }],
      usage: { input_tokens: 5, output_tokens: 10 },
    })

    const result = await llm({ ...BASE_REQUEST, tier: 'fast', provider: 'anthropic' })

    expect(result.content).not.toContain(awsKey)
    expect(result.content).toContain('[REDACTED]')
  })

  test('clean response passes through without modification', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    const cleanContent = 'The endpoint is vulnerable to SQL injection. Use parameterized queries.'
    anthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: cleanContent }],
      usage: { input_tokens: 5, output_tokens: 10 },
    })

    const result = await llm({ ...BASE_REQUEST, tier: 'fast', provider: 'anthropic' })
    expect(result.content).toBe(cleanContent)
  })
})
