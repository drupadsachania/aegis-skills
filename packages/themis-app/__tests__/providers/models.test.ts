import { ChatAnthropic } from '@langchain/anthropic'
import { ChatOpenAI } from '@langchain/openai'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { ProviderUnavailableError } from '@aegis-skills/themis-core'
import { chatModel } from '../../src/providers/models'
import { DEFAULT_MODELS, modelFor } from '../../src/providers/catalog'
import { parseConfig } from '../../src/config/config'
import { KeyStore } from '../../src/config/keys'
import path from 'node:path'
import os from 'node:os'

const keys = (env: Record<string, string>) => new KeyStore(path.join(os.tmpdir(), 'nonexistent.env'), env)

describe('chatModel', () => {
  const cfg = parseConfig({ local: { model: 'llama3.1:8b', baseURL: 'http://127.0.0.1:1234/v1', preset: 'lmstudio' } })

  it('builds each provider from the single catalog', () => {
    const a = chatModel('anthropic', 'fast', {}, { config: cfg, keys: keys({ ANTHROPIC_API_KEY: 'k-anthropic-123' }) })
    expect(a).toBeInstanceOf(ChatAnthropic)
    expect((a as ChatAnthropic).model).toBe(DEFAULT_MODELS.anthropic.fast)
    const o = chatModel('openai', 'standard', {}, { config: cfg, keys: keys({ OPENAI_API_KEY: 'k-openai-123' }) })
    expect(o).toBeInstanceOf(ChatOpenAI)
    const g = chatModel('google', 'power', {}, { config: cfg, keys: keys({ GOOGLE_API_KEY: 'k-google-123' }) })
    expect(g).toBeInstanceOf(ChatGoogleGenerativeAI)
  })

  it('routes local through ChatOpenAI with the configured baseURL and model', () => {
    const l = chatModel('local', 'fast', {}, { config: cfg, keys: keys({}) })
    expect(l).toBeInstanceOf(ChatOpenAI)
    expect((l as ChatOpenAI).model).toBe('llama3.1:8b')
    const kw = (l as unknown as { lc_kwargs: { configuration: { baseURL: string } } }).lc_kwargs
    expect(kw.configuration.baseURL).toBe('http://127.0.0.1:1234/v1')
  })

  it('honours per-tier model overrides', () => {
    const c = parseConfig({ models: { openai: { fast: 'gpt-x-test' } } })
    expect(modelFor('openai', 'fast', c)).toBe('gpt-x-test')
    expect(modelFor('openai', 'power', c)).toBe(DEFAULT_MODELS.openai.power)
  })

  it('throws ProviderUnavailableError when a key or local model is missing', () => {
    expect(() => chatModel('anthropic', 'fast', {}, { config: cfg, keys: keys({}) })).toThrow(ProviderUnavailableError)
    expect(() => chatModel('local', 'fast', {}, { config: parseConfig({}), keys: keys({}) })).toThrow(ProviderUnavailableError)
  })
})
