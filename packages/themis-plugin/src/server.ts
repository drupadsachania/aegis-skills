import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { PluginDeps } from './deps'
import { registerWorkflowTools } from './tools/workflow-tools'
import { registerCapabilityTools } from './tools/capability-tools'
import { registerGatewayTools } from './tools/gateway-tools'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pkg = require('../package.json') as { version: string }

export function createThemisMcpServer(deps: PluginDeps): McpServer {
  const server = new McpServer({ name: 'themis', version: pkg.version })
  registerWorkflowTools(server, deps)
  registerCapabilityTools(server, deps)
  registerGatewayTools(server, deps)
  return server
}
