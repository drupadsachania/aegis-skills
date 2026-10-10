import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { useTempHome } from '../helpers/fixtures'
import { makeTestDeps, startTestServer } from '../helpers/test-deps'
import { request as rawRequest, authed, type ReqOpts, type Resp } from '../helpers/http-client'
import { createDashboardServer, type Dashboard } from '../../src/server/http'
import { UI_CSP } from '../../src/server/security'

useTempHome()

const API_CSP = "default-src 'none'; frame-ancestors 'none'"

function makeUi(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'themis-ui-'))
  fs.mkdirSync(path.join(dir, 'assets'))
  fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>t</title>')
  fs.writeFileSync(path.join(dir, 'assets', 'app.js'), 'console.log(1)')
  return dir
}

describe('dashboard server', () => {
  let dash: Dashboard
  let ui: string
  beforeEach(async () => {
    ui = makeUi()
    dash = await startTestServer(makeTestDeps(), ui)
  })
  afterEach(async () => {
    await dash.close()
    fs.rmSync(ui, { recursive: true, force: true })
  })

  // Every response in this file is checked for CORS headers.
  async function req(method: string, p: string, o: ReqOpts = {}): Promise<Resp> {
    const r = await rawRequest(dash.port, method, p, o)
    expect(Object.keys(r.headers).filter((h) => h.startsWith('access-control-'))).toEqual([])
    return r
  }
  const auth = (extra: Record<string, string> = {}): Record<string, string> => authed(dash.port, dash.token, extra)

  it('swaps the one-time token for an HttpOnly SameSite=Strict cookie', async () => {
    const ok = await req('GET', `/?t=${dash.token}`)
    expect(ok.status).toBe(302)
    expect(ok.headers.location).toBe('/')
    expect(String(ok.headers['set-cookie'])).toMatch(/HttpOnly; SameSite=Strict/)
    const bad = await req('GET', '/?t=wrong')
    expect(bad.status).toBe(401)
    expect(bad.headers['set-cookie']).toBeUndefined()
  })

  it('requires the session cookie for the API', async () => {
    const no = await req('GET', '/api/health')
    expect(no.status).toBe(401)
    expect(no.json).toEqual({ error: 'Not authenticated' })
    const yes = await req('GET', '/api/health', { headers: auth() })
    expect(yes.status).toBe(200)
    expect(yes.json.versions).toBeDefined()
  })

  it('rejects a foreign Host header (DNS rebinding)', async () => {
    const r = await req('GET', '/api/health', { headers: auth({ Host: `evil.example:${dash.port}` }) })
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Host not allowed')
  })

  it('requires an allowed Origin on POST', async () => {
    const h = { Cookie: `themis_session_${dash.port}=${dash.token}` }
    expect((await req('POST', '/api/runs', { headers: h, body: { task: 'x' } })).status).toBe(403)
    expect((await req('POST', '/api/runs', { headers: { ...h, Origin: 'http://evil.example' }, body: { task: 'x' } })).status).toBe(403)
  })

  it('answers OPTIONS with 405 and sends no CORS headers', async () => {
    expect((await req('OPTIONS', '/api/health', { headers: auth() })).status).toBe(405)
  })

  it('404 for unknown API paths, 405 for a wrong method', async () => {
    expect((await req('GET', '/api/nope', { headers: auth() })).status).toBe(404)
    expect((await req('DELETE', '/api/health', { headers: auth() })).status).toBe(405)
  })

  it('serves the static UI with a strict CSP and blocks traversal', async () => {
    const page = await req('GET', '/', { headers: auth() })
    expect(page.status).toBe(200)
    expect(page.text).toContain('<title>t</title>')
    expect(page.headers['content-security-policy']).toBe(UI_CSP)
    expect(page.headers['x-frame-options']).toBe('DENY')
    const js = await req('GET', '/assets/app.js', { headers: auth() })
    expect(js.status).toBe(200)
    expect(String(js.headers['content-type'])).toMatch(/^text\/javascript/)
    expect((await req('GET', '/%2e%2e/%2e%2e/package.json', { headers: auth() })).status).toBe(404)
  })

  it('does not serve the UI without a session', async () => {
    expect((await req('GET', '/')).status).toBe(401)
  })

  it('every JSON response is no-store with the API CSP', async () => {
    for (const r of [
      await req('GET', '/api/health', { headers: auth() }),
      await req('GET', '/api/nope', { headers: auth() }),
      await req('GET', '/api/health'),
    ]) {
      expect(r.headers['cache-control']).toBe('no-store')
      expect(r.headers['content-security-policy']).toBe(API_CSP)
    }
  })
})

describe('dashboard server without a built UI', () => {
  it('answers 503 "not built"', async () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'themis-ui-empty-'))
    const dash = await startTestServer(makeTestDeps(), empty)
    try {
      const r = await rawRequest(dash.port, 'GET', '/', { headers: authed(dash.port, dash.token) })
      expect(r.status).toBe(503)
      expect(r.text).toContain('not built')
    } finally {
      await dash.close()
      fs.rmSync(empty, { recursive: true, force: true })
    }
  })
})

describe('bind policy', () => {
  it('refuses a non-loopback bind unless explicitly allowed', async () => {
    await expect(createDashboardServer({ host: '0.0.0.0', port: 0, deps: makeTestDeps(), uiDir: os.tmpdir() })).rejects.toThrow(/Refusing to bind/)
  })
})
