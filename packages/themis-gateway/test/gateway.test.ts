import { createMemoryStore, loadMcpServers, _resetMcpConfigCache, type McpServerConfig, type ThemisStore } from '@aegis-skills/themis-core'
import { createGateway, type McpConnector } from '../src'

const OSINT: McpServerConfig = { id: 'osint', transport: 'http', url: 'https://mcp.example/osint', allowedSkills: ['attack-surface-mapping'], allowWrite: true, maxCalls: 2, timeoutMs: 15000 }
const READ = { name: 'lookup_host', description: 'DNS lookup', annotations: { readOnlyHint: true } }
const WRITE = { name: 'create_ticket', description: 'open a ticket' }
const EXEC = { name: 'run_command', description: 'run', annotations: { readOnlyHint: true } }

function setup(opts: { server?: Partial<McpServerConfig>; tools?: object[]; text?: string; store?: ThemisStore; skill?: string } = {}) {
  const store = opts.store ?? createMemoryStore()
  const listServerTools = jest.fn(async () => (opts.tools ?? [READ, WRITE]).map((t) => ({ serverId: 'osint', ...t })))
  const callServerTool = jest.fn(async () => ({ ok: true, text: opts.text ?? 'A 203.0.113.1' }))
  const connector = { listServerTools, callServerTool } as unknown as McpConnector
  const gw = createGateway({ skill: opts.skill ?? 'attack-surface-mapping', runId: 'run-1', store, servers: [{ ...OSINT, ...opts.server }], connector })
  return { store, gw, listServerTools, callServerTool, connector }
}

beforeEach(() => _resetMcpConfigCache())

it('offers nothing to a skill no server allowlists (default-deny), without connecting', async () => {
  const { gw, listServerTools } = setup({ skill: 'malware-analysis' })
  expect(await gw.listTools()).toEqual([])
  expect(listServerTools).not.toHaveBeenCalled()
})
it('falls back to THEMIS_MCP_SERVERS config when servers are not passed', async () => {
  loadMcpServers(JSON.stringify([{ id: 'osint', transport: 'http', url: 'https://mcp.example/osint', allowedSkills: ['attack-surface-mapping'] }]))
  const { connector } = setup()
  const gw = createGateway({ skill: 'attack-surface-mapping', runId: 'r', store: createMemoryStore(), connector })
  expect((await gw.listTools()).map((t) => t.name)).toEqual(['themis__osint__lookup_host'])   // allowWrite defaults false
})
it('classifies tools and namespaces them', async () => {
  const { gw } = setup({ tools: [READ, WRITE, EXEC] })
  expect((await gw.listTools()).map((t) => [t.name, t.toolClass, t.disposition])).toEqual([
    ['themis__osint__lookup_host', 'read', 'auto'],
    ['themis__osint__create_ticket', 'write', 'approval'],
    ['themis__osint__run_command', 'execute', 'approval'],
  ])
})
it('omits write/execute tools when the server did not opt in to write', async () => {
  const { gw } = setup({ server: { allowWrite: false }, tools: [READ, WRITE, EXEC] })
  expect((await gw.listTools()).map((t) => t.name)).toEqual(['themis__osint__lookup_host'])
})
it('runs read tools and wraps output as untrusted', async () => {
  const { gw, callServerTool } = setup()
  const r = await gw.call('themis__osint__lookup_host', { host: 'example.com' })
  expect(r.kind).toBe('result')
  const text = (r as { text: string }).text
  expect(text).toMatch(/^<external_tool_output server="osint" tool="lookup_host" ok="true">\n/)
  expect(text).toContain('203.0.113.1')
  expect(callServerTool).toHaveBeenCalledWith(expect.objectContaining({ id: 'osint' }), 'lookup_host', { host: 'example.com' })
  expect(gw.callCount()).toBe(1)
})
it('redacts and truncates read output', async () => {
  const { gw } = setup({ text: 'AKIAIOSFODNN7EXAMPLE ' + 'x'.repeat(5000) })
  const { text } = (await gw.call('themis__osint__lookup_host', {})) as { text: string }
  expect(text).not.toContain('AKIAIOSFODNN7EXAMPLE')
  expect(text).toContain('[REDACTED]')
  expect(text).toContain('[truncated]')
})
it('enforces the per-server call budget', async () => {
  const { gw, callServerTool } = setup()
  await gw.call('themis__osint__lookup_host', {})
  await gw.call('themis__osint__lookup_host', {})
  expect(await gw.call('themis__osint__lookup_host', {})).toEqual({ kind: 'budget_exhausted' })
  expect(callServerTool).toHaveBeenCalledTimes(2)
})
it('turns write/execute calls into pending approval requests — never executed', async () => {
  const { gw, store, callServerTool } = setup()
  const r = await gw.call('themis__osint__create_ticket', { title: 't', password: 'hunter2' }, { reason: 'record finding' })
  expect(r.kind).toBe('approval_required')
  expect(callServerTool).not.toHaveBeenCalled()
  const [a] = store.listApprovals({ runId: 'run-1' })
  expect(a).toMatchObject({ id: (r as { approvalId: string }).approvalId, serverId: 'osint', tool: 'create_ticket', toolClass: 'write', status: 'pending', decidedBy: null, reason: 'record finding' })
  expect(JSON.stringify(a.args)).not.toContain('hunter2')
})
it('denies unknown tools', async () => {
  const { gw } = setup()
  expect((await gw.call('themis__osint__nope', {})).kind).toBe('denied')
})
it('soft-fails: unreachable servers mean no tools; a throwing call is an error result', async () => {
  const { gw, listServerTools } = setup()
  listServerTools.mockRejectedValueOnce(new Error('down'))
  expect(await gw.listTools()).toEqual([])
  const { gw: gw2, callServerTool: call2 } = setup()
  call2.mockRejectedValueOnce(new Error('boom'))
  expect((await gw2.call('themis__osint__lookup_host', {})).kind).toBe('error')
})
it('audits every call and result with redacted data', async () => {
  const { gw, store } = setup()
  await gw.call('themis__osint__lookup_host', { q: 'AKIAIOSFODNN7EXAMPLE' })
  await gw.call('themis__osint__create_ticket', {}, { reason: 'r' })
  const events = store.listAudit('run-1')
  expect(events.map((e) => e.kind)).toEqual(['tool_call', 'tool_result', 'tool_call', 'approval_requested'])
  expect(JSON.stringify(events)).not.toContain('AKIAIOSFODNN7EXAMPLE')
})
it('fails closed when the audit log cannot be written', async () => {
  const base = createMemoryStore()
  const store: ThemisStore = { ...base, appendAudit: () => { throw new Error('disk full') } }
  const { gw, callServerTool } = setup({ store })
  expect((await gw.call('themis__osint__lookup_host', {})).kind).toBe('error')
  expect(callServerTool).not.toHaveBeenCalled()
})
