import { ProviderUnavailableError } from '@aegis-skills/themis-core'
import { useTempHome } from '../helpers/fixtures'
import { ScriptedChatModel, text } from '../helpers/scripted-model'
import { setChatModelFactoryForTests } from '../../src/providers/models'
import { llm, withProvider, resolveProvider, configuredProviders } from '../../src/providers/llm'
import { setConfigValue } from '../../src/config/config'
import { KeyStore } from '../../src/config/keys'

describe('llm shim', () => {
  useTempHome()
  let model: ScriptedChatModel
  const seen: string[] = []
  beforeEach(() => {
    seen.length = 0
    model = new ScriptedChatModel(() => text('```json\n{"ok":true}\n```'))
    setChatModelFactoryForTests((p) => { seen.push(p); return model })
  })
  afterAll(() => setChatModelFactoryForTests(null))

  it('uses the provider from withProvider() and strips a JSON code fence', async () => {
    new KeyStore().set('openai', 'sk-test-0000000000')
    const r = await withProvider('openai', () => llm({ systemPrompt: 's', userMessage: 'u', maxTokens: 10, temperature: 0, tier: 'fast' }))
    expect(seen).toEqual(['openai'])
    expect(r.content).toBe('{"ok":true}')
  })

  it('redacts secrets in model output', async () => {
    model = new ScriptedChatModel(() => text('key AKIAIOSFODNN7EXAMPLE leaked'))
    new KeyStore().set('anthropic', 'sk-ant-test-000000')
    const r = await withProvider('anthropic', () => llm({ systemPrompt: 's', userMessage: 'u', maxTokens: 10, temperature: 0, tier: 'fast' }))
    expect(r.content).not.toContain('AKIAIOSFODNN7EXAMPLE')
  })

  it('folds the system prompt into the user turn for o1 models', async () => {
    new KeyStore().set('openai', 'sk-test-0000000000')
    setConfigValue('models.openai.fast', 'o1-mini')
    await withProvider('openai', () => llm({ systemPrompt: 'SYS', userMessage: 'USR', maxTokens: 10, temperature: 0, tier: 'fast' }))
    const msgs = model.calls[0]
    expect(msgs).toHaveLength(1)
    expect(String(msgs[0].content)).toBe('SYS\n\nUSR')
  })

  it('resolves requested → default → first configured provider, else throws', () => {
    expect(() => resolveProvider()).toThrow(ProviderUnavailableError)
    new KeyStore().set('google', 'AIza-test-000000')
    expect(configuredProviders()).toEqual(['google'])
    expect(resolveProvider()).toBe('google')
    expect(() => resolveProvider('anthropic')).toThrow(ProviderUnavailableError)
    setConfigValue('local.model', 'llama3.1:8b')
    setConfigValue('defaultProvider', 'local')
    expect(resolveProvider()).toBe('local')
  })
})
