import { HumanMessage } from '@langchain/core/messages'
import { redactSecrets } from '@aegis-skills/themis-core'
import { loadConfig, updateConfig } from '../config/config'
import { KeyStore } from '../config/keys'
import { chatModel } from './models'
import { modelFor, type ProviderId } from './catalog'

export interface TestResult {
  ok: boolean
  provider: ProviderId
  model: string | null
  latencyMs: number
  toolCalling?: 'supported' | 'unsupported' // local only
  models?: string[]                          // local only: ids from GET /models
  error?: string                             // redacted, ≤ 200 chars, never contains a key
}

function safe(e: unknown, key?: string): string {
  let msg = redactSecrets(e instanceof Error ? e.message : String(e))
  if (key) msg = msg.split(key).join('[key]')
  return msg.slice(0, 200)
}

export async function testConnection(provider: ProviderId): Promise<TestResult> {
  const start = Date.now()
  const done = (r: Omit<TestResult, 'provider' | 'latencyMs'>): TestResult =>
    ({ provider, latencyMs: Date.now() - start, ...r })
  const cfg = loadConfig()
  const keys = new KeyStore()

  if (provider !== 'local') {
    const model = modelFor(provider, 'fast', cfg)
    try {
      await chatModel(provider, 'fast', { maxTokens: 16, temperature: 0 })
        .invoke([new HumanMessage('Reply with the single word: ok')])
      return done({ ok: true, model })
    } catch (e) {
      return done({ ok: false, model, error: safe(e, keys.get(provider)) })
    }
  }

  const base = cfg.local.baseURL.replace(/\/+$/, '')
  const key = keys.get('local')
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (key) headers.authorization = `Bearer ${key}`

  let models: string[]
  try {
    const res = await fetch(`${base}/models`, { headers, signal: AbortSignal.timeout(5000) })
    if (!res.ok) return done({ ok: false, model: null, error: `Models endpoint returned ${res.status}` })
    const json = (await res.json()) as { data?: Array<{ id?: unknown }> }
    models = (json.data ?? []).map((d) => d.id).filter((id): id is string => typeof id === 'string')
  } catch {
    return done({ ok: false, model: null, error: `Cannot reach ${base} — is the server running?` })
  }

  const model = cfg.local.model
  if (!model) return done({ ok: false, model: null, models, error: 'Choose a model' })
  if (!models.includes(model)) {
    return done({ ok: false, model, models, error: `Model "${model}" is not available on this server` })
  }

  let toolCalling: 'supported' | 'unsupported'
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(60000),
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 256,
        messages: [{ role: 'user', content: 'Call the ping tool with value "ok".' }],
        tools: [{
          type: 'function',
          function: {
            name: 'ping',
            description: 'Connectivity check',
            parameters: { type: 'object', properties: { value: { type: 'string' } }, required: ['value'] },
          },
        }],
      }),
    })
    if (res.status >= 500) return done({ ok: false, model, models, error: `Server error ${res.status} during tool probe` })
    if (!res.ok) {
      toolCalling = 'unsupported'
    } else {
      const json = (await res.json()) as { choices?: Array<{ message?: { tool_calls?: Array<{ function?: { name?: string } }> } }> }
      const calls = json.choices?.[0]?.message?.tool_calls ?? []
      toolCalling = calls.some((c) => c.function?.name === 'ping') ? 'supported' : 'unsupported'
    }
  } catch (e) {
    return done({ ok: false, model, models, error: safe(e, key) })
  }

  updateConfig((c) => {
    c.local.toolCalling = toolCalling
    c.local.toolCallingCheckedAt = new Date().toISOString()
  })
  return done({ ok: true, model, models, toolCalling })
}
