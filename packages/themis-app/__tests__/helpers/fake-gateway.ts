import { newApprovalRequest, canExecuteApproval, type ThemisStore } from '@aegis-skills/themis-core'
import type { Gateway, GatewayResult, GovernedTool } from '@aegis-skills/themis-gateway'

export interface FakeGatewayLog { executed: string[]; calls: Array<{ name: string; args: unknown }>; listed: number }

const TOOLS: GovernedTool[] = [
  { name: 'themis__fake__lookup_host', serverId: 'fake', tool: 'lookup_host', toolClass: 'read', disposition: 'auto', description: 'DNS lookup', inputSchema: { type: 'object', properties: { host: { type: 'string' } } } },
  { name: 'themis__fake__create_ticket', serverId: 'fake', tool: 'create_ticket', toolClass: 'write', disposition: 'approval', description: 'Open a ticket', inputSchema: { type: 'object', properties: { title: { type: 'string' } } } },
]

/** Same contract as createGateway: writes become pending approvals; only a human decision executes, once, in-process. */
export function fakeGatewayFactory(store: ThemisStore, log: FakeGatewayLog = { executed: [], calls: [], listed: 0 }) {
  const factory = ({ runId }: { skill: string; runId: string }): Gateway => {
    const raw = new Map<string, unknown>()
    return {
      async listTools() { log.listed++; return TOOLS.map((t) => ({ ...t })) },
      async call(name, args) {
        log.calls.push({ name, args })
        const t = TOOLS.find((x) => x.name === name)
        if (!t) return { kind: 'denied', reason: 'unknown tool' }
        if (t.disposition === 'auto') return { kind: 'result', text: '<external_tool_output server="fake" tool="lookup_host" ok="true">\nA 203.0.113.1\n</external_tool_output>' }
        const a = newApprovalRequest({ runId, serverId: 'fake', tool: t.tool, toolClass: 'write', args, reason: 'test' })
        store.putApproval(a)
        raw.set(a.id, args)
        return { kind: 'approval_required', approvalId: a.id }
      },
      async executeApproved(id): Promise<GatewayResult> {
        const a = store.getApproval(id)
        if (!a || a.runId !== runId) return { kind: 'denied', reason: 'Unknown approval for this run.' }
        const gate = canExecuteApproval(a)
        if (!gate.ok) return { kind: 'denied', reason: gate.reason ?? 'not approved' }
        if (!raw.has(id)) return { kind: 'denied', reason: 'Original arguments are unavailable in this process; re-propose the action.' }
        raw.delete(id)
        log.executed.push(id)
        return { kind: 'result', text: '<external_tool_output server="fake" tool="create_ticket" ok="true">\nTICKET-1\n</external_tool_output>' }
      },
      callCount: () => log.calls.length,
      async close() { raw.clear() },
    }
  }
  return { factory, log }
}
