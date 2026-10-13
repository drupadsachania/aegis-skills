import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { useTempHome } from '../helpers/fixtures'
import { ScriptedChatModel, text } from '../helpers/scripted-model'
import { setChatModelFactoryForTests } from '../../src/providers/models'
import { DEFAULT_MODELS } from '../../src/providers/catalog'
import { testConnection } from '../../src/providers/test-connection'
import { loadConfig, setConfigValue } from '../../src/config/config'
import { KeyStore } from '../../src/config/keys'

type Mode = 'tools' | 'text' | 'reject'

describe('testConnection', () => {
  useTempHome()
  let server: http.Server
  let mode: Mode = 'tools'
  let lastAuth: string | undefined
  let closed = false

  beforeEach(async () => {
    mode = 'tools'
    lastAuth = undefined
    closed = false
    server = http.createServer((req, res) => {
      lastAuth = req.headers.authorization
      const send = (status: number, body: unknown) => {
        res.writeHead(status, { 'content-type': 'application/json' })
        res.end(JSON.stringify(body))
      }
      if (req.url === '/v1/models') return send(200, { data: [{ id: 'llama3.1:8b' }] })
      if (req.url === '/v1/chat/completions') {
        req.resume()
        req.on('end', () => {
          if (mode === 'tools') {
            send(200, { choices: [{ message: { tool_calls: [{ function: { name: 'ping', arguments: '{"value":"ok"}' } }] } }] })
          } else if (mode === 'text') {
            send(200, { choices: [{ message: { content: 'ok' } }] })
          } else {
            send(400, { error: { message: 'tools not supported' } })
          }
        })
        return
      }
      send(404, {})
    })
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
    const port = (server.address() as AddressInfo).port
    setConfigValue('local.baseURL', `http://127.0.0.1:${port}/v1`)
    setConfigValue('local.model', 'llama3.1:8b')
  })

  afterEach(async () => {
    if (!closed) await new Promise<void>((r) => server.close(() => r()))
    setChatModelFactoryForTests(null)
  })

  it('detects supported tool calling and persists it', async () => {
    const r = await testConnection('local')
    expect(r.ok).toBe(true)
    expect(r.toolCalling).toBe('supported')
    const c = loadConfig()
    expect(c.local.toolCalling).toBe('supported')
    expect(c.local.toolCallingCheckedAt).not.toBeNull()
  })

  it('marks a model that answers with plain text as unsupported', async () => {
    mode = 'text'
    const r = await testConnection('local')
    expect(r.toolCalling).toBe('unsupported')
  })

  it('treats a 4xx on the tool probe as unsupported', async () => {
    mode = 'reject'
    const r = await testConnection('local')
    expect(r.ok).toBe(true)
    expect(r.toolCalling).toBe('unsupported')
  })

  it('reports a model missing from the server', async () => {
    setConfigValue('local.model', 'qwen-missing')
    const r = await testConnection('local')
    expect(r.ok).toBe(false)
    expect(r.error).toContain('not available')
    expect(r.models).toEqual(['llama3.1:8b'])
  })

  it('reports an unreachable server and leaves config unchanged', async () => {
    await new Promise<void>((r) => server.close(() => r()))
    closed = true
    const r = await testConnection('local')
    expect(r.ok).toBe(false)
    expect(r.error).toContain('Cannot reach')
    expect(loadConfig().local.toolCalling).toBe('unknown')
  })

  it('sends the local key as a bearer token', async () => {
    new KeyStore().set('local', 'sk-local-xyz')
    await testConnection('local')
    expect(lastAuth).toBe('Bearer sk-local-xyz')
  })

  it('cloud success uses the fast tier model', async () => {
    new KeyStore().set('anthropic', 'sk-ant-test-000000')
    setChatModelFactoryForTests(() => new ScriptedChatModel(() => text('ok')))
    const r = await testConnection('anthropic')
    expect(r.ok).toBe(true)
    expect(r.model).toBe(DEFAULT_MODELS.anthropic.fast)
  })

  it('cloud failure never leaks the key', async () => {
    new KeyStore().set('anthropic', 'sk-ant-SECRET-123456')
    setChatModelFactoryForTests(() => new ScriptedChatModel(() => { throw new Error('401 bad key sk-ant-SECRET-123456') }))
    const r = await testConnection('anthropic')
    expect(r.ok).toBe(false)
    expect(r.error).toBeDefined()
    expect(r.error).not.toContain('sk-ant-SECRET-123456')
  })
})
