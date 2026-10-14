// createGateway — the governed path for every external MCP call, in both modes.
//   every call (read, write, execute) → NEVER runs on the model's say-so: recorded as a pending
//                     approval; executeApproved() runs it only after a human decision (contracts §6).
//                     Owner decision 2026-10-14: reads too, so nothing reaches an external API unapproved.
//   read results    → per-server budget, redaction, size cap, wrapped as untrusted
// Every call, result and approval is written to the run's audit log; if the log
// cannot be written the call fails closed. Unreachable servers degrade to no tools.
import {
  auditEvent, canExecuteApproval, classifyTool, dispositionFor, loadMcpServers, newApprovalRequest,
  redactSecrets, serverOffers, serversForSkill,
  type AuditEvent, type McpServerConfig, type McpToolDescriptor, type ThemisStore,
} from '@aegis-skills/themis-core'
import { defaultConnector, type McpConnector } from './client'

export const MAX_OUTPUT_CHARS = 4000

export interface GovernedTool {
  name: string                   // `themis__${serverId}__${tool}`
  serverId: string
  tool: string
  toolClass: 'read' | 'write' | 'execute'
  disposition: 'auto' | 'approval'
  description: string
  inputSchema: unknown           // may be undefined when the server declares none
}

export type GatewayResult =
  | { kind: 'result'; text: string }       // tool-level failures are results with ok="false"
  | { kind: 'approval_required'; approvalId: string }
  | { kind: 'denied'; reason: string }
  | { kind: 'budget_exhausted' }
  | { kind: 'error'; message: string }     // gateway-internal failure; never thrown

export interface Gateway {
  listTools(): Promise<GovernedTool[]>
  call(name: string, args: unknown, opts?: { reason?: string }): Promise<GatewayResult>
  executeApproved(approvalId: string): Promise<GatewayResult>
  callCount(): number
  close(): Promise<void>
}

export interface GatewayOptions {
  skill: string
  runId: string
  store: ThemisStore
  servers?: McpServerConfig[]
  connector?: McpConnector
}

interface Entry { tool: GovernedTool; server: McpServerConfig }

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

export function governedName(serverId: string, tool: string): string {
  return `themis__${serverId}__${tool}`
}

const TAG = 'external_tool_output'

/** Escape any opening or closing wrapper tag inside untrusted text so it cannot end the wrapper early. */
export function neutraliseWrapperTags(text: string): string {
  return text.replace(/<(\s*\/?\s*external_tool_output)/gi, '&lt;$1')
}

const attr = (v: string): string => v.replace(/[^A-Za-z0-9_.:-]/g, '_')

export function wrapUntrusted(serverId: string, tool: string, ok: boolean, text: string): string {
  let t = neutraliseWrapperTags(redactSecrets(text))
  if (t.length > MAX_OUTPUT_CHARS) t = t.slice(0, MAX_OUTPUT_CHARS) + '\n[truncated]'
  // Wrap so the model cannot mistake external output for system instructions.
  return `<${TAG} server="${attr(serverId)}" tool="${attr(tool)}" ok="${ok}">\n${t}\n</${TAG}>`
}

export function createGateway(opts: GatewayOptions): Gateway {
  const { skill, runId, store } = opts
  const connector = opts.connector ?? defaultConnector
  const servers = serversForSkill(skill, opts.servers ?? loadMcpServers())
  const used = new Map<string, number>()                         // read calls per server
  const rawArgs = new Map<string, Record<string, unknown>>()     // approvalId → unredacted args (memory only)
  const executing = new Set<string>()
  let entries: Map<string, Entry> | null = null
  let closed = false

  const audit = (kind: AuditEvent['kind'], data: unknown): void => store.appendAudit(auditEvent(runId, kind, data))
  const deny = (reason: string, data: Record<string, unknown>): GatewayResult => {
    audit('error', { ...data, denied: reason })
    return { kind: 'denied', reason }
  }

  async function load(): Promise<Map<string, Entry>> {
    if (entries) return entries
    const map = new Map<string, Entry>()
    for (const server of servers) {
      let descriptors: McpToolDescriptor[] = []
      try { descriptors = await connector.listServerTools(server) } catch { descriptors = [] }
      for (const d of descriptors) {
        const toolClass = classifyTool(d)
        const disposition = dispositionFor(toolClass, server)
        if (!serverOffers(toolClass, server)) continue   // write/execute without allowWrite: omitted entirely
        const name = governedName(server.id, d.name)
        if (map.has(name)) continue
        map.set(name, { server, tool: { name, serverId: server.id, tool: d.name, toolClass, disposition, description: d.description ?? d.name, inputSchema: d.inputSchema } })
      }
    }
    entries = map
    return map
  }

  return {
    async listTools() {
      if (closed) return []
      try { return [...(await load()).values()].map((e) => ({ ...e.tool })) } catch { return [] }
    },

    async call(name, args, callOpts = {}) {
      if (closed) return { kind: 'error', message: 'Gateway is closed.' }
      try {
        const entry = (await load()).get(name)
        if (!entry) return deny(`Tool "${name}" is not available to skill "${skill}".`, { tool: name })
        const { server, tool } = entry
        const callArgs = isRecord(args) ? args : {}
        audit('tool_call', { tool: name, toolClass: tool.toolClass, disposition: tool.disposition, args: callArgs })

        if (tool.toolClass === 'read' && (used.get(server.id) ?? 0) >= server.maxCalls) {
          audit('error', { tool: name, budgetExhausted: true, maxCalls: server.maxCalls })
          return { kind: 'budget_exhausted' }
        }

        const approval = newApprovalRequest({
          runId, serverId: server.id, tool: tool.tool,
          toolClass: tool.toolClass,
          args: callArgs, reason: callOpts.reason ?? '',
        })
        store.putApproval(approval)
        rawArgs.set(approval.id, callArgs)
        audit('approval_requested', { approvalId: approval.id, tool: name, toolClass: approval.toolClass })
        return { kind: 'approval_required', approvalId: approval.id }
      } catch {
        return { kind: 'error', message: 'Governed tool call failed.' }
      }
    },

    async executeApproved(approvalId) {
      if (closed) return { kind: 'error', message: 'Gateway is closed.' }
      if (executing.has(approvalId)) return { kind: 'denied', reason: 'Approval is already executing.' }
      executing.add(approvalId)
      try {
        const a = store.getApproval(approvalId)
        if (!a || a.runId !== runId) return deny('Unknown approval for this run.', { approvalId })
        const gate = canExecuteApproval(a)
        if (!gate.ok) return deny(gate.reason ?? 'Approval not granted.', { approvalId })
        const done = store.listAudit(runId).some((e) => e.kind === 'tool_result' && isRecord(e.data) && e.data.approvalId === approvalId)
        if (done) return deny('Approval was already executed.', { approvalId })
        const server = servers.find((s) => s.id === a.serverId)
        if (!server || !serverOffers(a.toolClass, server)) return deny('Server does not permit write actions for this skill.', { approvalId })
        if (a.toolClass === 'read') {
          const n = used.get(server.id) ?? 0
          if (n >= server.maxCalls) {
            audit('error', { approvalId, budgetExhausted: true, maxCalls: server.maxCalls })
            return { kind: 'budget_exhausted' }
          }
          used.set(server.id, n + 1)
        }
        const stored = isRecord(a.args) ? a.args : {}
        const args = rawArgs.get(approvalId) ?? (JSON.stringify(stored).includes('[REDACTED]') ? null : stored)
        if (!args) return deny('Original arguments are unavailable in this process; re-propose the action.', { approvalId })
        const name = governedName(a.serverId, a.tool)
        audit('tool_call', { approvalId, tool: name, toolClass: a.toolClass, args })
        const outcome = await connector.callServerTool(server, a.tool, args)
        const text = wrapUntrusted(server.id, a.tool, outcome.ok, outcome.text)
        audit('tool_result', { approvalId, tool: name, ok: outcome.ok, chars: text.length })
        rawArgs.delete(approvalId)
        return { kind: 'result', text }
      } catch {
        return { kind: 'error', message: 'Approved action failed.' }
      } finally {
        executing.delete(approvalId)
      }
    },

    callCount() {
      let n = 0
      for (const v of used.values()) n += v
      return n
    },

    async close() {
      closed = true
      rawArgs.clear()
      entries = null
    },
  }
}
