import path from 'node:path'
import { useTempHome } from '../helpers/fixtures'
import { startHarness, type Harness } from '../helpers/route-harness'
import { loadConfig } from '../../src/config/config'

const home = useTempHome()

describe('settings routes', () => {
  let h: Harness
  beforeEach(async () => { h = await startHarness() })
  afterEach(() => h.close())

  it('lists the four data files under THEMIS_HOME', async () => {
    const r = await h.call('GET', '/api/settings')
    expect(r.status).toBe(200)
    expect(r.json.home).toBe(home.dir())
    expect(r.json.files).toEqual({
      config: path.join(home.dir(), 'config.json'), env: path.join(home.dir(), '.env'),
      coreDb: path.join(home.dir(), 'themis.db'), appDb: path.join(home.dir(), 'app.db'),
    })
    expect(r.json.envFileProtection).toMatch(/^(posix-0600|windows-user-profile-acl)$/)
  })

  it('persists allowed changes', async () => {
    const r = await h.call('PUT', '/api/settings', { body: { limits: { maxConcurrentRuns: 3 } } })
    expect(r.status).toBe(200)
    expect(r.json.limits.maxConcurrentRuns).toBe(3)
    expect(loadConfig().limits.maxConcurrentRuns).toBe(3)
  })

  it('rejects out-of-range values and any other key', async () => {
    expect((await h.call('PUT', '/api/settings', { body: { limits: { maxConcurrentRuns: 9 } } })).status).toBe(400)
    expect((await h.call('PUT', '/api/settings', { body: { mcpServers: [] } })).status).toBe(400)
    expect((await h.call('PUT', '/api/settings', { body: { dashboard: { port: 80 } } })).status).toBe(400)
    expect((await h.call('PUT', '/api/settings', { body: { limits: { maxConcurrentRuns: 2, evil: 1 } } })).status).toBe(400)
  })
})
