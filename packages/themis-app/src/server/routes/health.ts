import type { Router } from '../router'
import { sendJson } from '../respond'

export function registerHealthRoutes(r: Router): void {
  r.add('GET', '/api/health', ({ res, deps }) => sendJson(res, 200, { ok: true, versions: deps.versions, providers: deps.configuredProviders() }))
}
