// Tool classification and call policy — deterministic, no LLM.
//
// Every external MCP tool is classified read | write | execute. No class is ever
// auto-invoked: every call is surfaced as an approval request for a human
// (reads included, owner decision 2026-10-14). `write`/`execute` tools are only
// offered when the server allows writes. Classification is conservative:
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
 * Decide how a classified tool may be used by an autonomous sub-agent. Owner decision 2026-10-14: nothing reaches
 * an external API without a person saying yes, so every class (read included) is 'approval'. 'auto' stays in the
 * type for compatibility with stored data and older callers, but is never returned.
 */
export function dispositionFor(_cls: ToolClass, _server: McpServerConfig): ToolDisposition {
  return 'approval'
}

/** Whether a server is even allowed to surface write/execute tools for approval. Read tools need no extra permission. */
export function serverPermitsApproval(server: McpServerConfig): boolean {
  return server.allowWrite === true
}

/** Whether a tool of this class from this server may be offered at all (reads always; writes/executes only with allowWrite). */
export function serverOffers(cls: ToolClass, server: McpServerConfig): boolean {
  return cls === 'read' || serverPermitsApproval(server)
}
