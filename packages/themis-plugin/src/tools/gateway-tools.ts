import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { PluginDeps } from '../deps'
import { decideFromHuman } from '../approval'
import { textResult, errorResult } from '../errors'

function clientSupportsElicitation(server: McpServer): boolean {
  try { return !!(server.server.getClientCapabilities() as { elicitation?: unknown } | undefined)?.elicitation } catch { return false }
}

export function registerGatewayTools(server: McpServer, deps: PluginDeps) {
  server.tool('themis_external_list',
    'List the governed external security tools available to a run for a skill.',
    { runId: z.string(), skill: z.string() },
    async ({ runId, skill }) => {
      try {
        const tools = await deps.gatewayFor(skill, runId).listTools()
        return textResult(tools.map((t) => ({ name: t.name, toolClass: t.toolClass, disposition: t.disposition, description: t.description, inputSchema: t.inputSchema })))
      } catch (e) { return errorResult('list_failed', e instanceof Error ? e.message : String(e)) }
    })

  server.tool('themis_external_call',
    'Propose a call to a governed external tool. Every call (read, write or execute) waits for a human approval before it runs.',
    { runId: z.string(), skill: z.string(), tool: z.string(), args: z.record(z.any()), reason: z.string().max(500).optional() },
    async ({ runId, skill, tool, args, reason }) => {
      try {
        const gateway = deps.gatewayFor(skill, runId)
        const res = await gateway.call(tool, args, { reason })
        switch (res.kind) {
          case 'result': return textResult({ status: 'ok', output: res.text })
          case 'budget_exhausted': return textResult({ status: 'budget_exhausted' })
          case 'denied': return textResult({ status: 'denied', reason: res.reason })
          case 'error': return textResult({ status: 'error', error: res.message })
          case 'approval_required': {
            const approval = deps.store.getApproval(res.approvalId)
            if (clientSupportsElicitation(server)) {
              try {
                // Ask the HUMAN via the client's own prompt. Never sampling/createMessage.
                const elicited = await server.server.elicitInput({
                  message: `Approve ${approval?.toolClass ?? 'write'} tool "${approval?.tool}"? Reason: ${approval?.reason ?? reason ?? ''}`,
                  requestedSchema: { type: 'object', properties: { approve: { type: 'boolean', description: 'Approve this action' } }, required: ['approve'] },
                })
                const accept = elicited.action === 'accept' && elicited.content?.approve === true
                const out = await decideFromHuman(deps.store, gateway, res.approvalId, accept)
                return textResult(out.kind === 'result'
                  ? { status: 'ok', output: out.text }
                  : { status: out.kind, reason: out.kind === 'denied' ? out.reason : undefined })
              } catch {
                // Elicitation failed (client refused / unsupported at runtime): fall through to handoff. Never execute.
              }
            }
            return textResult({
              status: 'human_handoff',
              approvalId: res.approvalId,
              proposed: { tool, reason: reason ?? approval?.reason ?? '' },
              instruction: 'This write/execute action was NOT run by Themis. A human must perform it through the host’s own permission-gated tools.',
            })
          }
        }
      } catch (e) { return errorResult('call_failed', e instanceof Error ? e.message : String(e)) }
    })
}
