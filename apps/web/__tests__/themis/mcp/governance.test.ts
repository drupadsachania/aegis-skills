// Tests for the deterministic MCP governance boundary: config validation,
// per-skill allowlisting, tool classification and disposition. No network.

import {
  loadMcpServers,
  serversForSkill,
  _resetMcpConfigCache,
  type McpServerConfig,
} from '@/lib/themis/mcp/config'
import {
  classifyTool,
  dispositionFor,
  serverPermitsApproval,
  type McpToolDescriptor,
} from '@/lib/themis/mcp/tool-policy'

beforeEach(() => _resetMcpConfigCache())

function server(over: Partial<McpServerConfig> = {}): McpServerConfig {
  return {
    id: 'osint', transport: 'http', url: 'https://mcp.example/osint',
    allowedSkills: ['attack-surface-mapping'], allowWrite: false,
    maxCalls: 5, timeoutMs: 15000, ...over,
  }
}

describe('loadMcpServers (default-deny config)', () => {
  it('returns [] when unset or empty', () => {
    expect(loadMcpServers('')).toEqual([])
    _resetMcpConfigCache()
    expect(loadMcpServers(undefined)).toEqual([])
  })

  it('returns [] on malformed JSON', () => {
    expect(loadMcpServers('{not json')).toEqual([])
  })

  it('parses a valid http server and clamps limits', () => {
    const out = loadMcpServers(JSON.stringify([{
      id: 'osint', transport: 'http', url: 'https://mcp.example/osint',
      allowedSkills: ['attack-surface-mapping'], maxCalls: 9999, timeoutMs: 1,
    }]))
    expect(out).toHaveLength(1)
    expect(out[0].maxCalls).toBeLessThanOrEqual(20)   // hard cap
    expect(out[0].timeoutMs).toBeGreaterThanOrEqual(1)
    expect(out[0].allowWrite).toBe(false)             // default
  })

  it('drops entries with invalid id, transport or url', () => {
    const out = loadMcpServers(JSON.stringify([
      { id: 'BAD ID', transport: 'http', url: 'https://x', allowedSkills: [] },
      { id: 'noturl', transport: 'http', url: 'file:///etc/passwd', allowedSkills: [] },
      { id: 'notransport', url: 'https://x', allowedSkills: [] },
      { id: 'ok', transport: 'http', url: 'https://ok.example', allowedSkills: ['s'] },
    ]))
    expect(out.map(s => s.id)).toEqual(['ok'])
  })

  it('de-duplicates server ids', () => {
    const out = loadMcpServers(JSON.stringify([
      { id: 'dup', transport: 'http', url: 'https://a', allowedSkills: [] },
      { id: 'dup', transport: 'http', url: 'https://b', allowedSkills: [] },
    ]))
    expect(out).toHaveLength(1)
  })
})

describe('serversForSkill (per-skill allowlist)', () => {
  it('only returns servers that list the skill', () => {
    const servers = [
      server({ id: 'a', allowedSkills: ['attack-surface-mapping'] }),
      server({ id: 'b', allowedSkills: ['network-security'] }),
      server({ id: 'c', allowedSkills: ['*'] }),
    ]
    expect(serversForSkill('attack-surface-mapping', servers).map(s => s.id)).toEqual(['a', 'c'])
    expect(serversForSkill('malware-analysis', servers).map(s => s.id)).toEqual(['c'])
  })

  it('returns nothing for a skill no server lists (default-deny)', () => {
    expect(serversForSkill('x', [server({ allowedSkills: ['y'] })])).toEqual([])
  })
})

describe('classifyTool (conservative classification)', () => {
  const t = (over: Partial<McpToolDescriptor>): McpToolDescriptor => ({ serverId: 's', name: 'x', ...over })

  it('classifies a read-only-hinted lookup as read', () => {
    expect(classifyTool(t({ name: 'lookup_domain', annotations: { readOnlyHint: true } }))).toBe('read')
  })
  it('classifies execute verbs as execute even with a read-only hint', () => {
    expect(classifyTool(t({ name: 'run_command', annotations: { readOnlyHint: true } }))).toBe('execute')
  })
  it('classifies write verbs as write', () => {
    expect(classifyTool(t({ name: 'create_ticket', annotations: { readOnlyHint: true } }))).toBe('write')
  })
  it('classifies destructive-hinted tools as write', () => {
    expect(classifyTool(t({ name: 'cleanup', annotations: { destructiveHint: true } }))).toBe('write')
  })
  it('defaults to write when there is no positive read-only signal', () => {
    expect(classifyTool(t({ name: 'ambiguous_thing' }))).toBe('write')
  })
})

describe('dispositionFor / serverPermitsApproval', () => {
  it('read tools are auto, write/execute require approval', () => {
    expect(dispositionFor('read', server())).toBe('auto')
    expect(dispositionFor('write', server())).toBe('approval')
    expect(dispositionFor('execute', server())).toBe('approval')
  })
  it('a server only permits write/execute surfacing when it opted in', () => {
    expect(serverPermitsApproval(server({ allowWrite: false }))).toBe(false)
    expect(serverPermitsApproval(server({ allowWrite: true }))).toBe(true)
  })
})
