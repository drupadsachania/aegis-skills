import { createMemoryStore } from '@aegis-skills/themis-core'
import { buildGatewayTools, toolNameFor } from '../../src/graph/gateway-tools'
import { RunGateways } from '../../src/graph/run-gateways'
import { fakeGatewayFactory } from '../helpers/fake-gateway'

describe('gateway tool bridge', () => {
  it('produces unique, provider-safe tool names', () => {
    const taken = new Set<string>()
    const a = toolNameFor('a'.repeat(80), taken)
    const b = toolNameFor('a'.repeat(80), taken)
    expect(a).not.toBe(b)
    expect(a).toHaveLength(64)
    expect(b).toHaveLength(64)
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(toolNameFor('we ird/na.me', new Set())).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('read tool returns wrapped external output', async () => {
    const store = createMemoryStore()
    const gw = fakeGatewayFactory(store).factory({ skill: 's', runId: 'r1' })
    const tools = await buildGatewayTools(gw, 's', () => undefined)
    const read = tools.find((t) => t.name.endsWith('lookup_host'))!
    expect(await read.invoke({ host: 'example.com' })).toContain('<external_tool_output')
  })

  it('write tool files a pending approval and says NOT executed', async () => {
    const store = createMemoryStore()
    const gw = fakeGatewayFactory(store).factory({ skill: 's', runId: 'r1' })
    const seen: string[] = []
    const tools = await buildGatewayTools(gw, 's', (id) => seen.push(id))
    const write = tools.find((t) => t.name.endsWith('create_ticket'))!
    const out = await write.invoke({ title: 'x' })
    expect(out).toContain('NOT executed')
    expect(seen).toHaveLength(1)
    const a = store.getApproval(seen[0])!
    expect(a.status).toBe('pending')
    expect(a.decidedBy).toBeNull()
  })

  it('no tool can approve anything', async () => {
    const store = createMemoryStore()
    const spy = jest.spyOn(store, 'decideApproval')
    const gw = fakeGatewayFactory(store).factory({ skill: 's', runId: 'r1' })
    const tools = await buildGatewayTools(gw, 's', () => undefined)
    for (const t of tools) expect(t.name).not.toMatch(/approv|decid|grant/i)
    for (const t of tools) await t.invoke({ status: 'approved', decidedBy: 'human', title: 'x', host: 'h' })
    const all = store.listApprovals({ runId: 'r1' })
    expect(all.length).toBeGreaterThan(0)
    for (const a of all) expect(a.status).toBe('pending')
    expect(spy).not.toHaveBeenCalled()
  })

  it('listTools failure yields no tools', async () => {
    const gw = { listTools: async () => { throw new Error('down') } } as never
    expect(await buildGatewayTools(gw, 's', () => undefined)).toEqual([])
  })

  it('RunGateways keeps one gateway per run and skill', async () => {
    const store = createMemoryStore()
    const rg = new RunGateways(fakeGatewayFactory(store).factory)
    const g1 = rg.get('r1', 'compliance')
    expect(rg.get('r1', 'compliance')).toBe(g1)
    expect(rg.get('r1', 'other')).not.toBe(g1)
    rg.markProposed('ap1', 'r1', 'compliance')
    expect(rg.holdsArgs('ap1')).toBe(true)
    await rg.closeRun('r1')
    expect(rg.holdsArgs('ap1')).toBe(false)
  })
})
