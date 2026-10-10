import { randomBytes, timingSafeEqual } from 'node:crypto'
import type { IncomingMessage } from 'node:http'
import { HttpError } from './respond'

export const MAX_BODY_BYTES = 64 * 1024

export const BASE_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

export const UI_CSP = [
  "default-src 'self'", "script-src 'self'", "style-src 'self'", "img-src 'self' data:", "font-src 'self'",
  "connect-src 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'none'", "frame-ancestors 'none'",
].join('; ')

export type Gate = { ok: true } | { ok: false; status: number; error: string }
const OK: Gate = { ok: true }

export function newToken(): string { return randomBytes(32).toString('base64url') }

export function tokenEquals(given: string | undefined | null, token: string): boolean {
  if (!given) return false
  const a = Buffer.from(given)
  const b = Buffer.from(token)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function isLoopback(host: string): boolean {
  return host === 'localhost' || host === '::1' || host === '[::1]' || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)
}

/** Exact `host:port` values the Host header may carry (DNS-rebinding defence). */
export function allowedHosts(bindHost: string, port: number, extra: string[] = []): Set<string> {
  const names = new Set(['127.0.0.1', 'localhost', '[::1]'])
  if (!isLoopback(bindHost) && bindHost !== '0.0.0.0' && bindHost !== '::') names.add(bindHost.includes(':') ? `[${bindHost}]` : bindHost)
  for (const e of extra) if (/^[A-Za-z0-9.-]{1,253}$/.test(e)) names.add(e.toLowerCase())
  return new Set([...names].map((n) => `${n}:${port}`))
}

export const cookieName = (port: number): string => `themis_session_${port}`

export function sessionCookie(port: number, token: string): string {
  return `${cookieName(port)}=${token}; HttpOnly; SameSite=Strict; Path=/`
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  for (const part of (header ?? '').split(';')) {
    const i = part.indexOf('=')
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim()
  }
  return out
}

export function checkHost(req: IncomingMessage, allowed: Set<string>): Gate {
  return allowed.has(String(req.headers.host ?? '').toLowerCase()) ? OK : { ok: false, status: 403, error: 'Host not allowed' }
}

export function checkSession(req: IncomingMessage, port: number, token: string): Gate {
  return tokenEquals(parseCookies(req.headers.cookie)[cookieName(port)], token) ? OK : { ok: false, status: 401, error: 'Not authenticated' }
}

const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/** CSRF defence for state-changing requests: exact same-origin Origin, and Sec-Fetch-Site when sent. */
export function checkOrigin(req: IncomingMessage, allowed: Set<string>): Gate {
  if (!STATE_CHANGING.has(req.method ?? '')) return OK
  const origin = req.headers.origin
  if (!origin) return { ok: false, status: 403, error: 'Origin required' }
  let u: URL
  try { u = new URL(origin) } catch { return { ok: false, status: 403, error: 'Origin not allowed' } }
  if (u.protocol !== 'http:' || !allowed.has(u.host.toLowerCase())) return { ok: false, status: 403, error: 'Origin not allowed' }
  const site = req.headers['sec-fetch-site']
  if (site !== undefined && site !== 'same-origin') return { ok: false, status: 403, error: 'Cross-site request' }
  return OK
}

/** JSON only, <= 64 KiB; 415 / 413 / 400 otherwise. */
export async function readJsonBody(req: IncomingMessage, limit = MAX_BODY_BYTES): Promise<unknown> {
  const type = String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase()
  if (type !== 'application/json') throw new HttpError(415, 'Content-Type must be application/json')
  const declared = Number(req.headers['content-length'] ?? '0')
  if (declared > limit) throw new HttpError(413, 'Request body too large')
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    size += (chunk as Buffer).length
    if (size > limit) throw new HttpError(413, 'Request body too large')
    chunks.push(chunk as Buffer)
  }
  if (size === 0) return {}
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { throw new HttpError(400, 'Request invalid') }
}
