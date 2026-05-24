// We mock the LangChain provider packages to avoid real API calls.
// Tests verify: correct model name selected per tier, env key guard, provider guard.

import { ProviderUnavailableError } from '@/lib/themis/types'

jest.mock('@langchain/anthropic', () => ({
  ChatAnthropic: jest.fn().mockImplementation((opts: Record<string, unknown>) => ({
    _type: 'chat-anthropic',
    ...opts,
  })),
}))

jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation((opts: Record<string, unknown>) => ({
    _type: 'chat-openai',
    ...opts,
  })),
}))

jest.mock('@langchain/google-genai', () => ({
  ChatGoogleGenerativeAI: jest.fn().mockImplementation((opts: Record<string, unknown>) => ({
    _type: 'chat-google',
    ...opts,
  })),
}))

const ORIG_ENV = process.env

beforeEach(() => {
  process.env = { ...ORIG_ENV }
})

afterEach(() => {
  process.env = ORIG_ENV
  jest.resetModules()
})

describe('modelForTier', () => {
  it('returns ChatAnthropic for anthropic/standard', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
    const { modelForTier } = await import('@/lib/themis/llm-factory')
    const model = modelForTier('standard', 'anthropic')
    expect((model as Record<string, unknown>)._type).toBe('chat-anthropic')
    expect((model as Record<string, unknown>).model).toBe('claude-sonnet-4-6')
  })

  it('returns ChatAnthropic with claude-opus for anthropic/power', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
    const { modelForTier } = await import('@/lib/themis/llm-factory')
    const model = modelForTier('power', 'anthropic')
    expect((model as Record<string, unknown>).model).toBe('claude-opus-4-6')
  })

  it('returns ChatOpenAI for openai/fast', async () => {
    process.env.OPENAI_API_KEY = 'sk-test'
    const { modelForTier } = await import('@/lib/themis/llm-factory')
    const model = modelForTier('fast', 'openai')
    expect((model as Record<string, unknown>)._type).toBe('chat-openai')
    expect((model as Record<string, unknown>).model).toBe('gpt-4o-mini')
  })

  it('returns ChatOpenAI with o1 for openai/power', async () => {
    process.env.OPENAI_API_KEY = 'sk-test'
    const { modelForTier } = await import('@/lib/themis/llm-factory')
    const model = modelForTier('power', 'openai')
    expect((model as Record<string, unknown>).model).toBe('o1')
  })

  it('returns ChatGoogleGenerativeAI for google/standard', async () => {
    process.env.GOOGLE_API_KEY = 'gkey-test'
    const { modelForTier } = await import('@/lib/themis/llm-factory')
    const model = modelForTier('standard', 'google')
    expect((model as Record<string, unknown>)._type).toBe('chat-google')
    expect((model as Record<string, unknown>).model).toBe('gemini-2.5-pro')
  })

  it('throws if ANTHROPIC_API_KEY is missing for anthropic provider', async () => {
    delete process.env.ANTHROPIC_API_KEY
    const { modelForTier } = await import('@/lib/themis/llm-factory')
    expect(() => modelForTier('fast', 'anthropic')).toThrow()
    try {
      modelForTier('fast', 'anthropic')
    } catch (e) {
      expect((e as any).internalReason).toBe('ANTHROPIC_API_KEY not configured')
    }
  })

  it('throws if OPENAI_API_KEY is missing for openai provider', async () => {
    delete process.env.OPENAI_API_KEY
    const { modelForTier } = await import('@/lib/themis/llm-factory')
    expect(() => modelForTier('fast', 'openai')).toThrow()
    try {
      modelForTier('fast', 'openai')
    } catch (e) {
      expect((e as any).internalReason).toBe('OPENAI_API_KEY not configured')
    }
  })

  it('throws if GOOGLE_API_KEY is missing for google provider', async () => {
    delete process.env.GOOGLE_API_KEY
    const { modelForTier } = await import('@/lib/themis/llm-factory')
    expect(() => modelForTier('fast', 'google')).toThrow()
    try {
      modelForTier('fast', 'google')
    } catch (e) {
      expect((e as any).internalReason).toBe('GOOGLE_API_KEY not configured')
    }
  })

  it('throws ProviderUnavailableError for unknown provider', async () => {
    const { modelForTier } = await import('@/lib/themis/llm-factory')
    expect(() => modelForTier('fast', 'unknown' as never)).toThrow()
  })
})
