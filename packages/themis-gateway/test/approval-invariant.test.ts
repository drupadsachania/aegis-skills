import fs from 'node:fs'
import path from 'node:path'
import { createMemoryStore, type McpServerConfig, type ThemisStore } from '@aegis-skills/themis-core'
import { createGateway, type McpConnector } from '../src'

const OSINT: McpServerConfig = { id: 'osint', transport: 'http', url: 'https://mcp.example/osint', allowedSkills: ['s'], allowWrite: true, maxCalls: 5, timeoutMs: 15000 }
function setup(store: ThemisStore = createMemoryStore(), runId = 'run-1') {
  const callServerTool = jest.fn(async () => ({ ok: true, text: 'done' }))
  const connector = {
    listServerTools: jest.fn(async () => [{ serverId: 'osint', name: 'create_ticket', description: 'open a ticket' }]),
    callServerTool,
  } as unknown as McpConnector
  return { store, callServerTool, gw: createGateway({ skill: 's', runId, store, servers: [OSINT], connector }) }
}
async function propose(gw: ReturnType<typeof setup>['gw'], args: Record<string, unknown> = { title: 't', password: 'hunter2' }) {
  const r = await gw.call('themis__osint__create_ticket', args, { reason: 'needed' })
  return (r as { approvalId: string }).approvalId
}

it('no gateway path ever calls decideApproval', async () => {
  const { gw, store } = setup()
  const spy = jest.spyOn(store, 'decideApproval')
  await gw.listTools()
  const id = await propose(gw, { status: 'approved', decidedBy: 'human' })   // model-supplied "approval" is just args
  await gw.executeApproved(id)
  expect(spy).not.toHaveBeenCalled()
  expect(store.getApproval(id)).toMatchObject({ status: 'pending', decidedBy: null })
})
it('refuses to execute a pending approval', async () => {
  const { gw, callServerTool } = setup()
  const id = await propose(gw)
  expect((await gw.executeApproved(id)).kind).toBe('denied')
  expect(callServerTool).not.toHaveBeenCalled()
})
it('refuses a rejected approval', async () => {
  const { gw, store, callServerTool } = setup()
  const id = await propose(gw)
  store.decideApproval(id, 'rejected')   // the test plays the human channel
  expect((await gw.executeApproved(id)).kind).toBe('denied')
  expect(callServerTool).not.toHaveBeenCalled()
})
it('refuses an "approved" record that no human decided (tampered store)', async () => {
  const base = createMemoryStore()
  const { gw, callServerTool } = setup({ ...base, getApproval: (id: string) => { const a = base.getApproval(id); return a && { ...a, status: 'approved', decidedBy: null } } })
  const id = await propose(gw)
  expect((await gw.executeApproved(id)).kind).toBe('denied')
  expect(callServerTool).not.toHaveBeenCalled()
})
it('executes a human-approved request exactly once, with the original arguments', async () => {
  const { gw, store, callServerTool } = setup()
  const id = await propose(gw)
  store.decideApproval(id, 'approved')
  const r = await gw.executeApproved(id)
  expect(r.kind).toBe('result')
  expect(callServerTool).toHaveBeenCalledWith(expect.objectContaining({ id: 'osint' }), 'create_ticket', { title: 't', password: 'hunter2' })
  expect(await gw.executeApproved(id)).toMatchObject({ kind: 'denied', reason: expect.stringMatching(/already executed/) })
  expect(store.listAudit('run-1').filter((e) => e.kind === 'tool_result')).toHaveLength(1)
})
it('after a restart, redacted arguments are never executed; clean ones are', async () => {
  const store = createMemoryStore()
  const first = setup(store)
  const secretId = await propose(first.gw)
  const cleanId = await propose(first.gw, { title: 'plain' })
  store.decideApproval(secretId, 'approved'); store.decideApproval(cleanId, 'approved')
  const second = setup(store)   // new process: no in-memory raw args
  expect(await second.gw.executeApproved(secretId)).toMatchObject({ kind: 'denied', reason: expect.stringMatching(/re-propose/) })
  expect((await second.gw.executeApproved(cleanId)).kind).toBe('result')
})
it('refuses approvals that belong to another run', async () => {
  const store = createMemoryStore()
  const a = setup(store, 'run-a')
  const id = await propose(a.gw)
  store.decideApproval(id, 'approved')
  expect((await setup(store, 'run-b').gw.executeApproved(id)).kind).toBe('denied')
})
it('no gateway or web Themis source calls decideApproval', () => {
  const roots = [path.join(__dirname, '..', 'src'), path.join(__dirname, '..', '..', '..', 'apps', 'web', 'lib', 'themis')]
  const files: string[] = []
  const walk = (d: string) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(ts|js)$/.test(e.name)) files.push(p) } }
  roots.forEach(walk)
  expect(files.length).toBeGreaterThan(5)
  expect(files.filter((f) => /\.decideApproval\s*\(/.test(fs.readFileSync(f, 'utf8')))).toEqual([])
})
