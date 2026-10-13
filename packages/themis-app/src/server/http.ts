import http, { type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { ProviderUnavailableError, ValidationError } from '@aegis-skills/themis-core'
import { Router } from './router'
import { REGISTRARS } from './routes'
import type { AppDeps } from './deps'
import { HttpError, sendJson, sendText } from './respond'
import { serveStatic } from './static'
import {
  BASE_HEADERS, allowedHosts, checkHost, checkOrigin, checkSession, isLoopback, newToken, readJsonBody, sessionCookie, tokenEquals,
} from './security'
import { BusyError, ConflictError, NotFoundError } from '../runner/runner'
import { KeyError } from '../config/keys'
import { ConfigError } from '../config/config'

export interface DashboardOptions {
  host: string
  port: number
  deps: AppDeps
  uiDir: string
  allowHosts?: string[]
  /** Must be true to bind a non-loopback address (CLI: only when --host is given). */
  allowNonLoopback?: boolean
  token?: string
}
export interface Dashboard { server: Server; url: string; token: string; port: number; close(): Promise<void> }

function toHttp(e: unknown): { status: number; error: string; headers?: Record<string, string> } {
  if (e instanceof HttpError) return { status: e.status, error: e.message }
  if (e instanceof ValidationError) return { status: 400, error: 'Request invalid' }
  if (e instanceof KeyError || e instanceof ConfigError) return { status: 400, error: e.message }
  if (e instanceof ProviderUnavailableError) return { status: 503, error: 'AI providers unavailable' }
  if (e instanceof BusyError) return { status: 429, error: e.message, headers: { 'Retry-After': '10' } }
  if (e instanceof ConflictError) return { status: 409, error: e.message }
  if (e instanceof NotFoundError) return { status: 404, error: 'Not found' }
  return { status: 500, error: 'Internal error' } // never leak internals
}

export async function createDashboardServer(o: DashboardOptions): Promise<Dashboard> {
  if (!isLoopback(o.host) && !o.allowNonLoopback) {
    throw new Error(`Refusing to bind ${o.host}: only loopback is allowed unless --host is given explicitly`)
  }
  const token = o.token ?? newToken()
  const router = new Router()
  for (const register of REGISTRARS) register(router)
  let allowed = new Set<string>()
  let port = o.port

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    for (const [k, v] of Object.entries(BASE_HEADERS)) res.setHeader(k, v)
    const host = checkHost(req, allowed)
    if (!host.ok) return sendJson(res, host.status, { error: host.error })
    let url: URL
    try { url = new URL(req.url ?? '/', 'http://themis.invalid') } catch { return sendJson(res, 400, { error: 'Request invalid' }) }
    const isApi = url.pathname.startsWith('/api/')

    if (!isApi && req.method === 'GET' && url.pathname === '/' && url.searchParams.has('t')) {
      if (!tokenEquals(url.searchParams.get('t'), token)) return sendText(res, 401, 'Invalid session link. Use the link printed by "themis dashboard".')
      res.writeHead(302, { 'Set-Cookie': sessionCookie(port, token), Location: '/', 'Cache-Control': 'no-store' })
      return void res.end()
    }
    const session = checkSession(req, port, token)
    if (!session.ok) {
      return isApi ? sendJson(res, session.status, { error: session.error }) : sendText(res, 401, 'Not signed in. Open the link printed by "themis dashboard".')
    }
    if (!isApi) return serveStatic(req, res, o.uiDir, url.pathname)
    if (req.method === 'OPTIONS') return sendJson(res, 405, { error: 'Method not allowed' })
    const origin = checkOrigin(req, allowed)
    if (!origin.ok) return sendJson(res, origin.status, { error: origin.error })
    try {
      const m = router.match(req.method ?? 'GET', url.pathname)
      if (m === null) return sendJson(res, 404, { error: 'Not found' })
      if (m === 'method_not_allowed') return sendJson(res, 405, { error: 'Method not allowed' })
      await m.handler({ req, res, params: m.params, query: url.searchParams, deps: o.deps, body: () => readJsonBody(req) })
    } catch (e) {
      const h = toHttp(e)
      if (!res.headersSent) sendJson(res, h.status, { error: h.error }, h.headers ?? {})
      else res.end()
    }
  }

  const server = http.createServer((req, res) => {
    handle(req, res).catch(() => { if (!res.headersSent) sendJson(res, 500, { error: 'Internal error' }); else res.destroy() })
  })
  server.headersTimeout = 10_000
  server.requestTimeout = 30_000
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(o.port, o.host, () => { server.off('error', reject); resolve() })
  })
  port = (server.address() as AddressInfo).port
  allowed = allowedHosts(o.host, port, o.allowHosts ?? [])
  const shownHost = isLoopback(o.host) || o.host === '0.0.0.0' || o.host === '::' ? '127.0.0.1' : o.host
  return {
    server, token, port,
    url: `http://${shownHost}:${port}/?t=${token}`,
    close: () => new Promise<void>((resolve) => { server.closeAllConnections(); server.close(() => resolve()) }),
  }
}
