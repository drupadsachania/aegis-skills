// Tests for the MCP→agent bridge: default-deny, read tools callable and
// budgeted, write/execute propose-only (never executed). The network client is
// mocked so nothing external is contacted.

jest.mock('@/lib/themis/secrets', () => ({ redactSecrets: (s: string) => s }))

const mockListServerTools = jest.fn()
const mockCallServerTool = jest.fn()
jest.mock('@/lib/themis/mcp/client', () => ({
  listServerTools: (...a: unknown[]) => mockListServerTools(...a),
  callServerTool: (...a: unknown[]) => mockCallServerTool(...a),
}))

import { buildMcpToolset } from '@/lib/themis/mcp/agent-tools'
import { loadMcpServers, _resetMcpConfigCache } from '@/lib/themis/mcp/config'

const CONFIG = JSON.stringify([{
  id: 'osint', transport: 'http', url: 'https://mcp.example/osint',
  allowedSkills: ['attack-surface-mapping'], allowWrite: true, maxCalls: 2,
}])

beforeEach(() => {
  jest.clearAllMocks()
  _resetMcpConfigCache()
  loadMcpServers(CONFIG) // prime cache so buildMcpToolset's loadMcpServers() sees it
})

describe('buildMcpToolset', () => {
  it('returns no tools for a skill with no configured server (default-deny)', async () => {
    const set = await buildMcpToolset('malware-analysis')
    expect(set.tools).toHaveLength(0)
    expect(mockListServerTools).not.toHaveBeenCalled()
  })

  it('exposes read tools as directly callable, wrapping untrusted output', async () => {
    mockListServerTools.mockResolvedValue([
      { serverId: 'osint', name: 'lookup_host', description: 'DNS lookup', annotations: { readOnlyHint: true } },
    ])
    mockCallServerTool.mockResolvedValue({ ok: true, text: 'A 203.0.113.1' })

    const set = await buildMcpToolset('attack-surface-mapping')
    expect(set.tools.map(t => t.name)).toEqual(['mcp__osint__lookup_host'])

    const out = await set.tools[0].func({ host: 'example.com' })
    expect(mockCallServerTool).toHaveBeenCalledTimes(1)
    expect(out).toContain('external_tool_output')
    expect(out).toContain('203.0.113.1')
    expect(set.getCallCount()).toBe(1)
  })

  it('enforces the per-run call budget', async () => {
    mockListServerTools.mockResolvedValue([
      { serverId: 'osint', name: 'lookup_host', annotations: { readOnlyHint: true } },
    ])
    mockCallServerTool.mockResolvedValue({ ok: true, text: 'ok' })
    const set = await buildMcpToolset('attack-surface-mapping')
    await set.tools[0].func({})
    await set.tools[0].func({})
    const third = await set.tools[0].func({}) // exceeds maxCalls = 2
    expect(third).toMatch(/budget exhausted/i)
    expect(mockCallServerTool).toHaveBeenCalledTimes(2)
  })

  it('makes write/execute tools propose-only — never executed', async () => {
    mockListServerTools.mockResolvedValue([
      { serverId: 'osint', name: 'create_ticket', description: 'open a ticket' },
    ])
    const set = await buildMcpToolset('attack-surface-mapping')
    expect(set.tools).toHaveLength(1)
    const out = await set.tools[0].func({ reason: 'need to record finding' })
    expect(out).toMatch(/NOT executed/i)
    expect(mockCallServerTool).not.toHaveBeenCalled()
    const approvals = set.getApprovals()
    expect(approvals).toHaveLength(1)
    expect(approvals[0]).toMatchObject({ serverId: 'osint', tool: 'create_ticket', toolClass: 'write' })
  })

  it('omits write/execute tools entirely when the server did not opt in to write', async () => {
    _resetMcpConfigCache()
    loadMcpServers(JSON.stringify([{
      id: 'osint', transport: 'http', url: 'https://mcp.example/osint',
      allowedSkills: ['attack-surface-mapping'], allowWrite: false,
    }]))
    mockListServerTools.mockResolvedValue([
      { serverId: 'osint', name: 'lookup', annotations: { readOnlyHint: true } },
      { serverId: 'osint', name: 'delete_record', description: 'delete a record' },
    ])
    const set = await buildMcpToolset('attack-surface-mapping')
    expect(set.tools.map(t => t.name)).toEqual(['mcp__osint__lookup'])
  })
})
