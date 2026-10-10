import type { Router } from '../router'
import type { AppDeps } from '../deps'
import { HttpError, asObject, sendJson } from '../respond'

function settingsView(deps: AppDeps) {
  const cfg = deps.config.load()
  const p = deps.paths
  return {
    home: p.home,
    files: { config: p.config, env: p.env, coreDb: p.coreDb, appDb: p.appDb },
    limits: { maxConcurrentRuns: cfg.limits.maxConcurrentRuns },
    dashboard: { port: cfg.dashboard.port },
    versions: deps.versions,
    envFileProtection: process.platform === 'win32' ? 'windows-user-profile-acl' : 'posix-0600',
  }
}

const onlyKeys = (o: Record<string, unknown>, allowed: string[]): void => {
  if (Object.keys(o).some((k) => !allowed.includes(k))) throw new HttpError(400, 'Request invalid')
}

export function registerSettingsRoutes(r: Router): void {
  r.add('GET', '/api/settings', ({ res, deps }) => sendJson(res, 200, settingsView(deps)))

  r.add('PUT', '/api/settings', async ({ res, body, deps }) => {
    const b = asObject(await body())
    onlyKeys(b, ['limits', 'dashboard'])
    const limits = 'limits' in b ? asObject(b.limits) : null
    const dashboard = 'dashboard' in b ? asObject(b.dashboard) : null
    if (limits) onlyKeys(limits, ['maxConcurrentRuns'])
    if (dashboard) onlyKeys(dashboard, ['port'])
    deps.config.update((c) => {
      if (limits && 'maxConcurrentRuns' in limits) c.limits.maxConcurrentRuns = limits.maxConcurrentRuns as number
      if (dashboard && 'port' in dashboard) c.dashboard.port = dashboard.port as number
    }) // range and type violations throw ConfigError (400)
    sendJson(res, 200, settingsView(deps))
  })
}
