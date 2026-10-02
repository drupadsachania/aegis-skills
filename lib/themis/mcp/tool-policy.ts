// Tool classification and call policy — deterministic, no LLM.
//
// Every external MCP tool is classified read | write | execute. Autonomous
// sub-agents may only auto-invoke `read` tools, and only when the owning server
// is configured to allow it. `write`/`execute` are never auto-invoked — they are
// surfaced as approval requests for a human. Classification is conservative:
// anything not clearly read-only is treated as write.

import type { McpServerConfig } from './config'

export type ToolClass = 'read' | 'write' | 'execute'

export interface McpToolDescriptor {
  serverId: string
  name: string
  description?: string
  inputSchema?: unknown
  annotations?: {
    readOnlyHint?: boolean
    destructiveHint?: boolean
    idempotentHint?: boolean
    openWorldHint?: boolean
  }
}

// Verbs that indicate a tool changes state or runs something, regardless of hints.
const EXECUTE_RE = /\b(exec|execute|run|spawn|shell|command|deploy|install|invoke_process)\b/i
const WRITE_RE = /\b(write|create|update|delete|remove|set|put|post|send|patch|modify|push|upload|publish|revoke|disable|enable|restart|kill|terminate)\b/i

/**
 * Classify a tool. Server/MCP annotations are advisory; name/description verbs
 * can only make the classification STRICTER, never more permissive. A tool is
 * `read` only when it is positively marked read-only AND shows no write/execute
 * verbs.
 */
export function classifyTool(tool: McpToolDescriptor): ToolClass {
  // Normalise separators to spaces so word-boundary matching works across
  // snake_case / kebab-case / camelCase tool names (run_command, createTicket).
  const hay = `${tool.name} ${tool.description ?? ''}`
    .replace(/[_\-/.]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  if (EXECUTE_RE.test(hay)) return 'execute'

  const markedReadOnly = tool.annotations?.readOnlyHint === true
  const markedDestructive = tool.annotations?.destructiveHint === true

  if (markedDestructive) return 'write'
  if (WRITE_RE.test(hay)) return 'write'
  if (markedReadOnly) return 'read'

  // No positive read-only signal → treat as write (default-deny for autonomy).
  return 'write'
}

export type ToolDisposition = 'auto' | 'approval'

/**
 * Decide how a classified tool may be used by an autonomous sub-agent:
 *  - 'auto'     : safe to invoke directly (read-only, server permits)
 *  - 'approval' : must be recorded as an approval request, never auto-invoked
 */
export function dispositionFor(cls: ToolClass, server: McpServerConfig): ToolDisposition {
  if (cls === 'read') return 'auto'
  // write/execute: only ever reach a human-approval queue, and only if the
  // server was explicitly configured to allow write at all.
  return 'approval'
}

/** Whether a server is even allowed to surface write/execute tools for approval. */
export function serverPermitsApproval(server: McpServerConfig): boolean {
  return server.allowWrite === true
}
