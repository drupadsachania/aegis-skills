// MCP client connector — connects to ONE configured, allowlisted server, lists
// its tools, and invokes a single read tool with a timeout. Every entry point
// fails soft (returns null / empty) so a misbehaving external server can never
// break a Themis run. Only servers that passed config validation reach here.

import type { McpServerConfig } from './config'
import type { McpToolDescriptor } from './tool-policy'

// SDK is CommonJS; import lazily so a missing optional dep never breaks module load.
/* eslint-disable @typescript-eslint/no-require-imports */
function sdk() {
  return {
    Client: require('@modelcontextprotocol/sdk/client/index.js').Client,
    StreamableHTTPClientTransport: require('@modelcontextprotocol/sdk/client/streamableHttp.js').StreamableHTTPClientTransport,
    StdioClientTransport: require('@modelcontextprotocol/sdk/client/stdio.js').StdioClientTransport,
  }
}
/* eslint-enable @typescript-eslint/no-require-imports */

interface Connected {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any
  close: () => Promise<void>
}

async function connect(server: McpServerConfig): Promise<Connected | null> {
  try {
    const { Client, StreamableHTTPClientTransport, StdioClientTransport } = sdk()
    let transport: unknown
    if (server.transport === 'http') {
      transport = new StreamableHTTPClientTransport(new URL(server.url as string), {
        requestInit: server.headers ? { headers: server.headers } : undefined,
      })
    } else {
      // stdio: local development only. Never reachable on serverless.
      transport = new StdioClientTransport({
        command: server.command as string,
        args: server.args ?? [],
      })
    }
    const client = new Client({ name: 'themis', version: '1.0.0' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await withTimeout(client.connect(transport as any), server.timeoutMs)
    return { client, close: async () => { try { await client.close() } catch { /* ignore */ } } }
  } catch {
    return null
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('mcp-timeout')), ms)
    p.then(
      v => { clearTimeout(timer); resolve(v) },
      e => { clearTimeout(timer); reject(e) },
    )
  })
}

/** List the tools a server exposes. Returns [] on any failure. */
export async function listServerTools(server: McpServerConfig): Promise<McpToolDescriptor[]> {
  const conn = await connect(server)
  if (!conn) return []
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await withTimeout<any>(conn.client.listTools(), server.timeoutMs)
    const tools = Array.isArray(res?.tools) ? res.tools : []
    return tools.map((t: Record<string, unknown>): McpToolDescriptor => ({
      serverId: server.id,
      name: String(t.name ?? ''),
      description: typeof t.description === 'string' ? t.description : undefined,
      inputSchema: t.inputSchema,
      annotations: (typeof t.annotations === 'object' && t.annotations !== null)
        ? (t.annotations as McpToolDescriptor['annotations'])
        : undefined,
    })).filter((t: McpToolDescriptor) => t.name.length > 0)
  } catch {
    return []
  } finally {
    await conn.close()
  }
}

export interface CallOutcome {
  ok: boolean
  text: string
}

/**
 * Invoke one tool on a server with a fresh connection and a timeout. Returns a
 * plain-text outcome; the caller is responsible for redaction and size caps.
 * Never throws.
 */
export async function callServerTool(
  server: McpServerConfig,
  toolName: string,
  args: Record<string, unknown>,
): Promise<CallOutcome> {
  const conn = await connect(server)
  if (!conn) return { ok: false, text: `MCP server "${server.id}" is unavailable.` }
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await withTimeout<any>(conn.client.callTool({ name: toolName, arguments: args }), server.timeoutMs)
    const content = Array.isArray(res?.content) ? res.content : []
    const text = content
      .filter((c: Record<string, unknown>) => c.type === 'text' && typeof c.text === 'string')
      .map((c: Record<string, unknown>) => c.text as string)
      .join('\n')
    if (res?.isError) return { ok: false, text: text || `Tool "${toolName}" returned an error.` }
    return { ok: true, text: text || '(tool returned no textual content)' }
  } catch {
    return { ok: false, text: `Tool "${toolName}" on "${server.id}" timed out or failed.` }
  } finally {
    await conn.close()
  }
}
