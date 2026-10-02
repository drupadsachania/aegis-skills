import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'

// skill-reader reads the skills directory from disk — Node runtime required.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createAegisMcpServer } = require('@/lib/mcp/aegis-server') as {
  createAegisMcpServer: () => {
    connect: (t: WebStandardStreamableHTTPServerTransport) => Promise<void>
    close: () => Promise<void>
  }
}

const MAX_BODY_BYTES = 64 * 1024

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store',
}

function withHeaders(res: Response): Response {
  const headers = new Headers(res.headers)
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v)
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
}

/**
 * Stateless Streamable HTTP MCP endpoint. A fresh server + transport per
 * request — no sessions, no shared state. Every tool is read-only and serves
 * only public skill content (see lib/mcp/aegis-server.js).
 */
async function handle(req: Request): Promise<Response> {
  const declared = Number(req.headers.get('content-length') ?? '0')
  if (declared > MAX_BODY_BYTES) {
    return withHeaders(new Response(JSON.stringify({ error: 'Request too large' }), {
      status: 413,
      headers: { 'Content-Type': 'application/json' },
    }))
  }

  const server = createAegisMcpServer()
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true,
  })

  try {
    await server.connect(transport)
    const res = await transport.handleRequest(req)
    return withHeaders(res)
  } catch {
    return withHeaders(new Response(JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32603, message: 'Internal error' },
      id: null,
    }), { status: 500, headers: { 'Content-Type': 'application/json' } }))
  } finally {
    // Stateless: tear down once the response has been produced.
    server.close().catch(() => {})
  }
}

export const POST = handle
export const GET = handle
export const DELETE = handle
