import { loadMcpServers, type McpServerConfig } from '@aegis-skills/themis-core'
import type { Router } from '../router'
import { HttpError, ID_RE, asObject, sendJson } from '../respond'

const MASK = '••••'
const MAX_SERVERS = 32

function mask(s: McpServerConfig): McpServerConfig {
  if (!s.headers) return { ...s }
  return { ...s, headers: Object.fromEntries(Object.keys(s.headers).map((k) => [k, MASK])) }
}

const stored = (cfg: { mcpServers: unknown[] }): McpServerConfig[] => loadMcpServers(JSON.stringify(cfg.mcpServers))

export function registerMcpRoutes(r: Router): void {
  r.add('GET', '/api/mcp/servers', ({ res, deps }) => {
    sendJson(res, 200, { servers: stored(deps.config.load()).map(mask) })
  })

  r.add('PUT', '/api/mcp/servers', async ({ res, body, deps }) => {
    const servers = asObject(await body()).servers
    if (!Array.isArray(servers) || servers.length > MAX_SERVERS) throw new HttpError(400, 'Request invalid')
    const existing = new Map(stored(deps.config.load()).map((s) => [s.id, s]))
    // A masked header value means "unchanged": take the stored secret, or drop the header.
    const restored = servers.map((raw: unknown) => {
      if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return raw
      const o = raw as Record<string, unknown>
      if (typeof o.headers !== 'object' || o.headers === null || Array.isArray(o.headers)) return o
      const prior = typeof o.id === 'string' ? existing.get(o.id)?.headers : undefined
      const headers: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(o.headers as Record<string, unknown>)) {
        if (v === MASK) { if (prior?.[k] !== undefined) headers[k] = prior[k] } else headers[k] = v
      }
      return { ...o, headers }
    })
    const normalised = loadMcpServers(JSON.stringify(restored))
    deps.config.update((c) => { c.mcpServers = normalised })
    sendJson(res, 200, { servers: normalised.map(mask), dropped: servers.length - normalised.length })
  })

  r.add('POST', '/api/mcp/servers/:id/test', async ({ res, params, deps }) => {
    if (!ID_RE.test(params.id)) throw new HttpError(400, 'Request invalid')
    const server = stored(deps.config.load()).find((s) => s.id === params.id)
    if (!server) throw new HttpError(404, 'Not found')
    sendJson(res, 200, await deps.testMcpServer(server))
  })
}
