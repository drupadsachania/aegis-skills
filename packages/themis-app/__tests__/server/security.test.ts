import { Readable } from 'node:stream'
import type { IncomingMessage } from 'node:http'
import {
  allowedHosts, checkHost, checkOrigin, checkSession, newToken, readJsonBody, sessionCookie, tokenEquals,
} from '../../src/server/security'
import { HttpError } from '../../src/server/respond'

const fake = (headers: Record<string, string>, method = 'GET'): IncomingMessage => ({ headers, method } as unknown as IncomingMessage)
const body = (text: string, headers: Record<string, string>): IncomingMessage => {
  const r = Readable.from([Buffer.from(text)]) as unknown as IncomingMessage
  r.headers = headers
  return r
}
const ALLOWED = allowedHosts('127.0.0.1', 9120)

describe('security primitives', () => {
  it('newToken is 256-bit url-safe and unique', () => {
    const a = newToken()
    expect(a.length).toBeGreaterThanOrEqual(43)
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(newToken()).not.toBe(a)
  })

  it('tokenEquals compares exactly', () => {
    expect(tokenEquals('abc', 'abc')).toBe(true)
    expect(tokenEquals(undefined, 'abc')).toBe(false)
    expect(tokenEquals('abd', 'abc')).toBe(false)
    expect(tokenEquals('abcd', 'abc')).toBe(false)
  })

  it('allowedHosts is exact', () => {
    expect([...ALLOWED].sort()).toEqual(['127.0.0.1:9120', '[::1]:9120', 'localhost:9120'])
    expect(allowedHosts('0.0.0.0', 9120, ['soc.lan']).has('soc.lan:9120')).toBe(true)
    expect(allowedHosts('0.0.0.0', 9120, ['soc.lan']).size).toBe(4)
  })

  it('checkHost rejects other hosts, other ports and a missing Host', () => {
    expect(checkHost(fake({ host: '127.0.0.1:9120' }), ALLOWED).ok).toBe(true)
    for (const host of ['evil.example:9120', '127.0.0.1:9999']) expect(checkHost(fake({ host }), ALLOWED)).toMatchObject({ ok: false, status: 403 })
    expect(checkHost(fake({}), ALLOWED)).toMatchObject({ ok: false, status: 403 })
  })

  it('checkSession needs the cookie for this port', () => {
    expect(checkSession(fake({}), 9120, 'tok')).toMatchObject({ ok: false, status: 401 })
    expect(checkSession(fake({ cookie: 'themis_session_9999=tok' }), 9120, 'tok')).toMatchObject({ ok: false, status: 401 })
    expect(checkSession(fake({ cookie: 'themis_session_9120=wrong' }), 9120, 'tok')).toMatchObject({ ok: false, status: 401 })
    expect(checkSession(fake({ cookie: 'a=b; themis_session_9120=tok' }), 9120, 'tok').ok).toBe(true)
  })

  it('checkOrigin protects state-changing requests', () => {
    const o = 'http://127.0.0.1:9120'
    expect(checkOrigin(fake({}, 'GET'), ALLOWED).ok).toBe(true)
    expect(checkOrigin(fake({}, 'POST'), ALLOWED)).toMatchObject({ ok: false, status: 403 })
    expect(checkOrigin(fake({ origin: 'http://evil.example' }, 'POST'), ALLOWED)).toMatchObject({ ok: false, status: 403 })
    expect(checkOrigin(fake({ origin: o, 'sec-fetch-site': 'cross-site' }, 'POST'), ALLOWED)).toMatchObject({ ok: false, status: 403 })
    expect(checkOrigin(fake({ origin: o, 'sec-fetch-site': 'same-origin' }, 'POST'), ALLOWED).ok).toBe(true)
    expect(checkOrigin(fake({ origin: 'https://127.0.0.1:9120' }, 'POST'), ALLOWED)).toMatchObject({ ok: false, status: 403 })
  })

  it('sessionCookie is HttpOnly, SameSite=Strict, host-only', () => {
    const c = sessionCookie(9120, 'tok')
    expect(c).toContain('HttpOnly')
    expect(c).toContain('SameSite=Strict')
    expect(c).toContain('Path=/')
    expect(c).not.toContain('Domain')
  })

  it('readJsonBody enforces type, size and syntax', async () => {
    const json = { 'content-type': 'application/json' }
    await expect(readJsonBody(body('{}', { 'content-type': 'text/plain' }))).rejects.toMatchObject({ status: 415 })
    const big = JSON.stringify({ a: 'x'.repeat(70000) })
    await expect(readJsonBody(body(big, json))).rejects.toMatchObject({ status: 413 })
    await expect(readJsonBody(body('{bad', json))).rejects.toMatchObject({ status: 400 })
    await expect(readJsonBody(body('{bad', json))).rejects.toBeInstanceOf(HttpError)
    await expect(readJsonBody(body('', json))).resolves.toEqual({})
    await expect(readJsonBody(body('{"a":1}', json))).resolves.toEqual({ a: 1 })
  })
})
