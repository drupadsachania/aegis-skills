import { useTempHome } from '../helpers/fixtures'
import { startHarness, type Harness } from '../helpers/route-harness'
import { loadConfig } from '../../src/config/config'

useTempHome()

const SECRET = 'Bearer super-secret-token-123'
const good = { id: 'osint', transport: 'http', url: 'https://mcp.example/osint', headers: { Authorization: SECRET }, allowedSkills: ['*'] }

describe('MCP server routes', () => {
  let h: Harness
  beforeEach(async () => { h = await startHarness() })
  afterEach(() => h.close())

  it('drops invalid servers and reports how many', async () => {
    const r = await h.call('PUT', '/api/mcp/servers', { body: { servers: [good, { id: 'BAD ID', transport: 'http', url: 'x' }] } })
    expect(r.status).toBe(200)
    expect(r.json.dropped).toBe(1)
    expect(r.json.servers).toHaveLength(1)
  })

  it('masks header values on read and never returns the secret', async () => {
    await h.call('PUT', '/api/mcp/servers', { body: { servers: [good] } })
    const r = await h.call('GET', '/api/mcp/servers')
    expect(r.json.servers[0].headers.Authorization).toBe('••••')
    expect(r.text).not.toContain(SECRET)
  })

  it('keeps the stored secret when the client echoes the mask', async () => {
    await h.call('PUT', '/api/mcp/servers', { body: { servers: [good] } })
    const echoed = (await h.call('GET', '/api/mcp/servers')).json.servers
    const r = await h.call('PUT', '/api/mcp/servers', { body: { servers: echoed } })
    expect(r.text).not.toContain(SECRET)
    expect((loadConfig().mcpServers[0] as { headers: Record<string, string> }).headers.Authorization).toBe(SECRET)
  })

  it('drops a masked header that has no stored value', async () => {
    const r = await h.call('PUT', '/api/mcp/servers', { body: { servers: [{ ...good, id: 'fresh', headers: { Authorization: '••••' } }] } })
    expect((loadConfig().mcpServers[0] as { headers: Record<string, string> }).headers).toEqual({})
    expect(r.json.servers[0].id).toBe('fresh')
  })

  it('rejects a non-array or an oversize list', async () => {
    expect((await h.call('PUT', '/api/mcp/servers', { body: { servers: 'x' } })).status).toBe(400)
    expect((await h.call('PUT', '/api/mcp/servers', { body: { servers: new Array(33).fill(good) } })).status).toBe(400)
  })

  it('tests a configured server and 404s an unknown one', async () => {
    await h.call('PUT', '/api/mcp/servers', { body: { servers: [good] } })
    expect((await h.call('POST', '/api/mcp/servers/nope/test', { body: {} })).status).toBe(404)
    const r = await h.call('POST', '/api/mcp/servers/osint/test', { body: {} })
    expect(r.status).toBe(200)
    expect(h.deps.testMcpServer).toHaveBeenCalledWith(expect.objectContaining({ id: 'osint' }))
  })
})
