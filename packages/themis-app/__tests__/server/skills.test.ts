import { useTempHome } from '../helpers/fixtures'
import { startHarness, type Harness } from '../helpers/route-harness'
import { loadConfig } from '../../src/config/config'

useTempHome()

describe('skill routes', () => {
  let h: Harness
  beforeEach(async () => {
    h = await startHarness({ skills: { list: () => [{ name: 'compliance', description: 'd', phases: 2, enabled: true, intelAsOf: null }] } })
  })
  afterEach(() => h.close())

  it('lists skills with the Aegis version and osk', async () => {
    const r = await h.call('GET', '/api/skills')
    expect(r.status).toBe(200)
    expect(r.json.aegis).toMatchObject({ version: '1.1.0', osk: '1.1' })
    expect(r.json.skills.map((s: { name: string }) => s.name)).toEqual(['compliance'])
  })

  it('disables and re-enables a skill', async () => {
    expect((await h.call('PUT', '/api/skills/compliance', { body: { enabled: false } })).json).toEqual({ name: 'compliance', enabled: false })
    expect(loadConfig().skills.disabled).toEqual(['compliance'])
    await h.call('PUT', '/api/skills/compliance', { body: { enabled: true } })
    expect(loadConfig().skills.disabled).toEqual([])
  })

  it('rejects unknown skills and non-boolean values', async () => {
    expect((await h.call('PUT', '/api/skills/nope', { body: { enabled: true } })).status).toBe(404)
    expect((await h.call('PUT', '/api/skills/compliance', { body: { enabled: 'yes' } })).status).toBe(400)
    expect((await h.call('PUT', '/api/skills/Bad_Name', { body: { enabled: true } })).status).toBe(400)
  })
})
