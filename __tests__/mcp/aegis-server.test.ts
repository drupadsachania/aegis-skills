// Protocol-level tests for the Aegis MCP server, using the SDK's in-memory
// transport pair (same Client/Server path a real client exercises).

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createAegisMcpServer } = require('@/lib/mcp/aegis-server')

async function connectedClient() {
  const server = createAegisMcpServer()
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const client = new Client({ name: 'test', version: '1.0.0' })
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
  return { client, server }
}

function parse(result: { content: Array<{ type: string; text: string }> }) {
  return JSON.parse(result.content[0].text)
}

describe('Aegis MCP server', () => {
  it('advertises exactly the three read-only tools', async () => {
    const { client, server } = await connectedClient()
    const { tools } = await client.listTools()
    const names = tools.map(t => t.name).sort()
    expect(names).toEqual(['get_skill', 'get_skill_phase', 'list_skills'])
    for (const t of tools) {
      expect(t.annotations?.readOnlyHint).toBe(true)
      expect(t.annotations?.destructiveHint).toBe(false)
    }
    await client.close(); await server.close()
  })

  it('list_skills returns real skills and filters by family', async () => {
    const { client, server } = await connectedClient()
    const all = parse(await client.callTool({ name: 'list_skills', arguments: {} }) as never)
    expect(all.count).toBeGreaterThanOrEqual(24)
    const intel = parse(await client.callTool({ name: 'list_skills', arguments: { family: 'intel' } }) as never)
    expect(intel.count).toBeLessThan(all.count)
    expect(intel.skills.map((s: { name: string }) => s.name)).toContain('exposure-validation')
    await client.close(); await server.close()
  })

  it('get_skill returns ordered phases for a real skill', async () => {
    const { client, server } = await connectedClient()
    const skill = parse(await client.callTool({ name: 'get_skill', arguments: { name: 'endpoint-security' } }) as never)
    expect(skill.name).toBe('endpoint-security')
    expect(Array.isArray(skill.phases)).toBe(true)
    expect(skill.phases[0]).toHaveProperty('id')
    await client.close(); await server.close()
  })

  it('get_skill_phase loads content by index and by id', async () => {
    const { client, server } = await connectedClient()
    const byIndex = await client.callTool({ name: 'get_skill_phase', arguments: { name: 'exposure-validation', phase: '0' } }) as { content: Array<{ text: string }>; isError?: boolean }
    expect(byIndex.isError).toBeFalsy()
    expect(byIndex.content[0].text.length).toBeGreaterThan(100)

    const byId = await client.callTool({ name: 'get_skill_phase', arguments: { name: 'endpoint-security', phase: 'edr-deployment' } }) as { content: Array<{ text: string }>; isError?: boolean }
    expect(byId.isError).toBeFalsy()
    expect(byId.content[0].text).toContain('EDR')
    await client.close(); await server.close()
  })

  it('reports an error for unknown skills and phases (without throwing)', async () => {
    const { client, server } = await connectedClient()
    const noSkill = await client.callTool({ name: 'get_skill', arguments: { name: 'no-such-skill' } }) as { isError?: boolean }
    expect(noSkill.isError).toBe(true)
    const noPhase = await client.callTool({ name: 'get_skill_phase', arguments: { name: 'endpoint-security', phase: 'nope' } }) as { isError?: boolean }
    expect(noPhase.isError).toBe(true)
    await client.close(); await server.close()
  })

  it('rejects a path-traversal skill name at the schema boundary', async () => {
    const { client, server } = await connectedClient()
    // The slug schema rejects the name before any filesystem access. Depending on
    // transport this surfaces as a throw or as an isError result — both block it.
    const res = await client
      .callTool({ name: 'get_skill', arguments: { name: '../../etc/passwd' } })
      .catch((e: Error) => ({ isError: true, content: [{ text: e.message }] }))
    expect((res as { isError?: boolean }).isError).toBe(true)
    expect((res as { content: Array<{ text: string }> }).content[0].text).toMatch(/invalid/i)
    await client.close(); await server.close()
  })
})
