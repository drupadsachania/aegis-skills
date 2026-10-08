'use strict'

/**
 * `aegis mcp` — serve the Aegis skill library over MCP on stdio.
 *
 * Client config (e.g. Claude Desktop / Cursor):
 *   { "mcpServers": { "aegis": { "command": "aegis", "args": ["mcp"] } } }
 *
 * stdout carries the JSON-RPC stream, so nothing in this process may write to
 * it. Diagnostics go to stderr only.
 */
module.exports = async function mcpCmd() {
  const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js')
  const { createAegisMcpServer } = require('../mcp/aegis-server')

  const server = createAegisMcpServer()
  const transport = new StdioServerTransport()

  const shutdown = async () => {
    try { await server.close() } catch { /* already closed */ }
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  try {
    await server.connect(transport)
    process.stderr.write('aegis MCP server ready on stdio\n')
  } catch (e) {
    process.stderr.write(`aegis MCP server failed to start: ${e && e.message ? e.message : e}\n`)
    process.exit(1)
  }
}
