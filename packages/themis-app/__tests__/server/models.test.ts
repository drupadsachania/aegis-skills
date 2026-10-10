import fs from 'node:fs'
import { useTempHome } from '../helpers/fixtures'
import { startHarness, type Harness } from '../helpers/route-harness'
import { loadConfig, paths, setConfigValue } from '../../src/config/config'

useTempHome()
const KEY = 'sk-ant-api03-FAKE-FULL-KEY-9999'

describe('models and keys routes', () => {
  let h: Harness
  beforeEach(async () => { delete process.env.ANTHROPIC_API_KEY; h = await startHarness() })
  afterEach(() => h.close())

  it('stores a key but only ever returns the masked form', async () => {
    const put = await h.call('PUT', '/api/models/keys/anthropic', { body: { key: KEY } })
    expect(put.status).toBe(200)
    expect(put.text).toContain('sk-…9999')
    expect(put.text).not.toContain(KEY)
    const view = await h.call('GET', '/api/models')
    expect(view.text).toContain('sk-…9999')
    expect(view.text).not.toContain(KEY)
    expect(fs.readFileSync(paths().env, 'utf8')).toContain(KEY)
  })

  it('removes a key', async () => {
    await h.call('PUT', '/api/models/keys/anthropic', { body: { key: KEY } })
    const del = await h.call('DELETE', '/api/models/keys/anthropic')
    expect(del.json.key.status).toBe('missing')
  })

  it('rejects unknown providers, non-string keys and keys with newlines', async () => {
    expect((await h.call('PUT', '/api/models/keys/nope', { body: { key: KEY } })).status).toBe(404)
    expect((await h.call('PUT', '/api/models/keys/anthropic', { body: { key: 5 } })).status).toBe(400)
    const nl = await h.call('PUT', '/api/models/keys/anthropic', { body: { key: 'abc\ndef' } })
    expect(nl.status).toBe(400)
    expect(nl.text).not.toContain('abc')
  })

  it('applies a local preset and resets the tool-calling probe', async () => {
    setConfigValue('local.toolCalling', 'supported')
    const r = await h.call('PUT', '/api/models/config', { body: { local: { preset: 'lmstudio' } } })
    expect(r.status).toBe(200)
    const cfg = loadConfig()
    expect(cfg.local.baseURL).toBe('http://127.0.0.1:1234/v1')
    expect(cfg.local.toolCalling).toBe('unknown')
    const local = r.json.providers.find((p: { id: string }) => p.id === 'local')
    expect(local.local.baseURL).toBe('http://127.0.0.1:1234/v1')
  })

  it('rejects an invalid baseURL, unknown fields and an unknown default provider', async () => {
    expect((await h.call('PUT', '/api/models/config', { body: { local: { baseURL: 'not a url' } } })).status).toBe(400)
    expect((await h.call('PUT', '/api/models/config', { body: { bogus: 1 } })).status).toBe(400)
    expect((await h.call('PUT', '/api/models/config', { body: { defaultProvider: 'mistral' } })).status).toBe(400)
  })

  it('sets the default provider and per-tier model overrides', async () => {
    const r = await h.call('PUT', '/api/models/config', { body: { defaultProvider: 'openai', models: { openai: { fast: 'my-small' } } } })
    expect(r.json.defaultProvider).toBe('openai')
    expect(r.json.providers.find((p: { id: string }) => p.id === 'openai').models.fast).toBe('my-small')
  })

  it('passes the connection test result through', async () => {
    const r = await h.call('POST', '/api/models/local/test', { body: {} })
    expect(r.status).toBe(200)
    expect(h.deps.testConnection).toHaveBeenCalledWith('local')
    expect(r.json).toMatchObject({ ok: true, provider: 'local' })
    expect((await h.call('POST', '/api/models/nope/test', { body: {} })).status).toBe(404)
  })
})
