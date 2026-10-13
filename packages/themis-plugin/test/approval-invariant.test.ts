import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { newApprovalRequest, canExecuteApproval } from '@aegis-skills/themis-core'
import { setup, tool, parse } from './helpers'

function srcFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? srcFiles(join(dir, e.name)) : e.name.endsWith('.ts') ? [join(dir, e.name)] : [])
}

describe('approval invariant', () => {
  it('only src/approval.ts references decideApproval', () => {
    const offenders = srcFiles(join(__dirname, '..', 'src'))
      .filter((f) => /\.decideApproval\s*\(/.test(readFileSync(f, 'utf8')))
      .filter((f) => !/[\\/]approval\.ts$/.test(f))
    expect(offenders).toEqual([])
  })

  it('no source file uses sampling (createMessage) — sampling asks the model, not a human', () => {
    const offenders = srcFiles(join(__dirname, '..', 'src')).filter((f) => /createMessage\s*\(|\.sampling\b/.test(readFileSync(f, 'utf8')))
    expect(offenders).toEqual([])
  })

  it('canExecuteApproval gates on approved + human', () => {
    const a = newApprovalRequest({ runId: 'r', serverId: 'osint', tool: 't', toolClass: 'write', args: {}, reason: 'x' })
    expect(canExecuteApproval(a).ok).toBe(false)
    expect(canExecuteApproval({ ...a, status: 'approved', decidedBy: null }).ok).toBe(false)
    expect(canExecuteApproval({ ...a, status: 'approved', decidedBy: 'human' }).ok).toBe(true)
  })

  it('model-supplied arguments cannot approve: no tool takes an approval decision', () => {
    const { deps, server } = setup()
    const tools = (server as unknown as { _registeredTools: Record<string, { inputSchema?: { shape?: Record<string, unknown> } }> })._registeredTools
    for (const [name, t] of Object.entries(tools)) {
      const keys = Object.keys(t.inputSchema?.shape ?? {})
      expect({ name, keys: keys.filter((k) => /approv|decid/i.test(k)) }).toEqual({ name, keys: [] })
    }
    deps.close()
  })

  it('a write call with approval-looking args stays pending when no human answers', async () => {
    const { deps, server } = setup()
    const store = deps.store
    let executed = false
    deps.gatewayFor = () => ({
      listTools: async () => [],
      call: async () => {
        const a = newApprovalRequest({ runId: 'r', serverId: 'osint', tool: 'create_ticket', toolClass: 'write', args: { status: 'approved', decidedBy: 'human' }, reason: 'x' })
        store.putApproval(a)
        return { kind: 'approval_required' as const, approvalId: a.id }
      },
      executeApproved: async () => { executed = true; return { kind: 'result' as const, text: 'x' } },
      callCount: () => 0, close: async () => undefined,
    })
    ;(server as unknown as { server: { getClientCapabilities: () => unknown } }).server.getClientCapabilities = () => undefined
    const r = parse(await tool(server, 'themis_external_call')({ runId: 'r', skill: 's', tool: 'themis__osint__create_ticket', args: { status: 'approved', decidedBy: 'human', approve: true } }))
    expect(r.status).toBe('human_handoff')
    expect(executed).toBe(false)
    expect(store.listApprovals({ runId: 'r' })[0]).toMatchObject({ status: 'pending', decidedBy: null })
    deps.close()
  })
})
