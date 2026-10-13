#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createThemisMcpServer } from './server'
import { buildDeps } from './deps'

// stdout carries JSON-RPC only; diagnostics go to stderr.
async function main() {
  const deps = buildDeps()
  const server = createThemisMcpServer(deps)
  const transport = new StdioServerTransport()
  const shutdown = async () => {
    try { await server.close() } catch { /* shutting down */ }
    try { deps.close() } catch { /* shutting down */ }
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  await server.connect(transport)
  process.stderr.write('themis MCP server ready on stdio\n')
}
main().catch((e) => { process.stderr.write(`themis MCP server failed: ${e instanceof Error ? e.message : String(e)}\n`); process.exit(1) })
