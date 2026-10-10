import type { Tier } from '@aegis-skills/themis-core'
import type { Router } from '../router'
import type { AppDeps } from '../deps'
import { HttpError, asObject, sendJson } from '../respond'
import { LOCAL_PRESETS, PROVIDERS, PROVIDER_ORDER, isProviderId, modelFor, type ProviderId } from '../../providers/catalog'

const TIERS: Tier[] = ['fast', 'standard', 'power']
const CLOUD = ['anthropic', 'openai', 'google'] as const

function modelsView(deps: AppDeps) {
  const cfg = deps.config.load()
  return {
    defaultProvider: cfg.defaultProvider,
    configured: deps.configuredProviders(),
    presets: { ollama: LOCAL_PRESETS.ollama, lmstudio: LOCAL_PRESETS.lmstudio },
    providers: PROVIDER_ORDER.map((id) => {
      const info = PROVIDERS[id]
      const models = id === 'local' && !cfg.local.model
        ? null
        : Object.fromEntries(TIERS.map((t) => [t, modelFor(id, t, cfg)]))
      return {
        id, label: info.label, kind: info.kind, keyUrl: info.keyUrl, key: deps.keys.status(id), models,
        ...(id === 'local' ? { local: { preset: cfg.local.preset, baseURL: cfg.local.baseURL, model: cfg.local.model, toolCalling: cfg.local.toolCalling, toolCallingCheckedAt: cfg.local.toolCallingCheckedAt } } : {}),
      }
    }),
  }
}

function providerParam(p: string): ProviderId {
  if (!isProviderId(p)) throw new HttpError(404, 'Not found')
  return p
}

const onlyKeys = (o: Record<string, unknown>, allowed: string[]): void => {
  if (Object.keys(o).some((k) => !allowed.includes(k))) throw new HttpError(400, 'Request invalid')
}

export function registerModelRoutes(r: Router): void {
  r.add('GET', '/api/models', ({ res, deps }) => sendJson(res, 200, modelsView(deps)))

  r.add('PUT', '/api/models/keys/:provider', async ({ res, params, body, deps }) => {
    const p = providerParam(params.provider)
    const key = asObject(await body()).key
    if (typeof key !== 'string') throw new HttpError(400, 'Request invalid')
    // The response carries only the masked status; the submitted key is never echoed.
    sendJson(res, 200, { provider: p, key: deps.keys.set(p, key) })
  })

  r.add('DELETE', '/api/models/keys/:provider', ({ res, params, deps }) => {
    const p = providerParam(params.provider)
    sendJson(res, 200, { provider: p, key: deps.keys.unset(p) })
  })

  r.add('PUT', '/api/models/config', async ({ res, body, deps }) => {
    const b = asObject(await body())
    onlyKeys(b, ['defaultProvider', 'models', 'local'])
    if ('defaultProvider' in b && b.defaultProvider !== null && !isProviderId(b.defaultProvider)) throw new HttpError(400, 'Request invalid')
    const models = 'models' in b ? asObject(b.models) : null
    if (models) {
      onlyKeys(models, [...CLOUD])
      for (const v of Object.values(models)) {
        const t = asObject(v)
        onlyKeys(t, TIERS)
      }
    }
    const local = 'local' in b ? asObject(b.local) : null
    if (local) onlyKeys(local, ['preset', 'baseURL', 'model'])

    deps.config.update((c) => {
      if ('defaultProvider' in b) c.defaultProvider = b.defaultProvider as ProviderId | null
      if (models) {
        for (const p of CLOUD) if (p in models) c.models[p] = { ...c.models[p], ...(models[p] as Record<string, string>) }
      }
      if (local) {
        const before = { baseURL: c.local.baseURL, model: c.local.model }
        if ('preset' in local) {
          c.local.preset = local.preset as typeof c.local.preset
          if (!('baseURL' in local) && (local.preset === 'ollama' || local.preset === 'lmstudio')) c.local.baseURL = LOCAL_PRESETS[local.preset]
        }
        if ('baseURL' in local) c.local.baseURL = local.baseURL as string
        if ('model' in local) c.local.model = local.model as string
        if (c.local.baseURL !== before.baseURL || c.local.model !== before.model) {
          c.local.toolCalling = 'unknown'
          c.local.toolCallingCheckedAt = null
        }
      }
    }) // schema violations throw ConfigError, which the server maps to 400
    sendJson(res, 200, modelsView(deps))
  })

  r.add('POST', '/api/models/:provider/test', async ({ res, params, deps }) => {
    sendJson(res, 200, await deps.testConnection(providerParam(params.provider)))
  })
}
