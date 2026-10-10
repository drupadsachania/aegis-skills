import { createGateway } from '@aegis-skills/themis-gateway'
import type { McpServerConfig, ThemisStore } from '@aegis-skills/themis-core'
import type { McpTestResult } from './server/deps'

/** Lists a server's governed tools (no calls). Reuses the gateway so classification matches runs. */
export async function testMcpServer(server: McpServerConfig, store: ThemisStore): Promise<McpTestResult> {
  const gw = createGateway({ skill: '__dashboard_test__', runId: 'mcp-test', store, servers: [{ ...server, allowedSkills: ['*'] }] })
  try {
    const tools = await gw.listTools()
    return {
      ok: tools.length > 0,
      tools: tools.map((t) => ({ name: t.tool, toolClass: t.toolClass, disposition: t.disposition })),
      ...(tools.length === 0 ? { error: 'No tools listed: the server is unreachable or exposes none.' } : {}),
    }
  } finally {
    await gw.close()
  }
}
