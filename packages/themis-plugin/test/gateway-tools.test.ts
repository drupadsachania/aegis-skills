import { newApprovalRequest } from '@aegis-skills/themis-core'
import { setup, tool, parse } from './helpers'

type FakeResult = { kind: string; [k: string]: unknown }

function withGateway(callResult: (deps: ReturnType<typeof setup>['deps']) => FakeResult) {
  const ctx = setup()
  const executeApproved = jest.fn(async () => ({ kind: 'result', text: 'ticket created' }))
  const fake = {
    listTools: async () => [{ name: 'themis__osint__lookup', serverId: 'osint', tool: 'lookup', toolClass: 'read', disposition: 'auto', description: 'd', inputSchema: {} }],
    call: jest.fn(async () => callResult(ctx.deps)),
    executeApproved, callCount: () => 0, close: async () => undefined,
  }
  ctx.deps.gatewayFor = () => fake as never
  return { ...ctx, fake, executeApproved }
}

const propose = (deps: ReturnType<typeof setup>['deps']): FakeResult => {
  const a = newApprovalRequest({ runId: 'r', serverId: 'osint', tool: 'create_ticket', toolClass: 'write', args: { title: 't' }, reason: 'record' })
  deps.store.putApproval(a)
  return { kind: 'approval_required', approvalId: a.id }
}

// Make the in-process McpServer behave like a client with (or without) elicitation.
function withClient(server: unknown, caps: object | undefined, elicit?: () => Promise<unknown>) {
  const low = (server as { server: { getClientCapabilities: () => unknown; elicitInput: unknown } }).server
  low.getClientCapabilities = () => caps
  if (elicit) low.elicitInput = elicit
}

const call = (server: unknown) => tool(server, 'themis_external_call')({ runId: 'r', skill: 's', tool: 'themis__osint__create_ticket', args: { title: 't' }, reason: 'record' })

it('lists governed tools', async () => {
  const { deps, server } = withGateway(() => ({ kind: 'result', text: '' }))
  const r = parse(await tool(server, 'themis_external_list')({ runId: 'r', skill: 's' }))
  expect(r[0]).toMatchObject({ name: 'themis__osint__lookup', disposition: 'auto' })
  deps.close()
})

it('returns read output, budget exhaustion, denial and errors as statuses', async () => {
  for (const [res, expected] of [
    [{ kind: 'result', text: 'A 1.2.3.4' }, { status: 'ok', output: 'A 1.2.3.4' }],
    [{ kind: 'budget_exhausted' }, { status: 'budget_exhausted' }],
    [{ kind: 'denied', reason: 'nope' }, { status: 'denied', reason: 'nope' }],
    [{ kind: 'error', message: 'down' }, { status: 'error', error: 'down' }],
  ] as [FakeResult, object][]) {
    const { deps, server } = withGateway(() => res)
    expect(parse(await call(server))).toEqual(expected)
    deps.close()
  }
})

it('a write with a human who ACCEPTS in the client prompt runs exactly once', async () => {
  const { deps, server, executeApproved } = withGateway(propose)
  withClient(server, { elicitation: {} }, async () => ({ action: 'accept', content: { approve: true } }))
  const r = parse(await call(server))
  expect(r).toEqual({ status: 'ok', output: 'ticket created' })
  expect(executeApproved).toHaveBeenCalledTimes(1)
  const [a] = deps.store.listApprovals({ runId: 'r' })
  expect(a).toMatchObject({ status: 'approved', decidedBy: 'human' })
  deps.close()
})

it('a write the human DECLINES is denied and never executes', async () => {
  const { deps, server, executeApproved } = withGateway(propose)
  withClient(server, { elicitation: {} }, async () => ({ action: 'decline' }))
  expect(parse(await call(server))).toMatchObject({ status: 'denied' })
  expect(executeApproved).not.toHaveBeenCalled()
  expect(deps.store.listApprovals({ runId: 'r' })[0]).toMatchObject({ status: 'rejected', decidedBy: 'human' })
  deps.close()
})

it('an accept without approve=true is not an approval', async () => {
  const { deps, server, executeApproved } = withGateway(propose)
  withClient(server, { elicitation: {} }, async () => ({ action: 'accept', content: { approve: false } }))
  expect(parse(await call(server)).status).toBe('denied')
  expect(executeApproved).not.toHaveBeenCalled()
  deps.close()
})

it('without client elicitation a write is handed to the human and stays pending', async () => {
  const { deps, server, executeApproved } = withGateway(propose)
  withClient(server, undefined)
  const r = parse(await call(server))
  expect(r.status).toBe('human_handoff')
  expect(executeApproved).not.toHaveBeenCalled()
  expect(deps.store.listApprovals({ runId: 'r' })[0]).toMatchObject({ status: 'pending', decidedBy: null })
  deps.close()
})

it('if elicitation throws at runtime the write falls back to handoff, never execution', async () => {
  const { deps, server, executeApproved } = withGateway(propose)
  withClient(server, { elicitation: {} }, async () => { throw new Error('client closed') })
  expect(parse(await call(server)).status).toBe('human_handoff')
  expect(executeApproved).not.toHaveBeenCalled()
  deps.close()
})
