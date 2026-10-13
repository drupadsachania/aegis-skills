import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { newApprovalRequest } from '@aegis-skills/themis-core'
import { createThemisMcpServer } from '../src/server'
import { buildDeps } from '../src/deps'
import { SLUGS, tool, parse } from './helpers'

let dir: string
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'themis-plugin-')) })
afterEach(() => { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }) })

const boot = (file: string) => {
  const deps = buildDeps({ storePath: file, skillSlugs: SLUGS })
  return { deps, server: createThemisMcpServer(deps) }
}

it('a restarted server resumes a run from the store at its last step', async () => {
  const file = path.join(dir, 'themis.db')
  const first = boot(file)
  const { runId } = parse(await tool(first.server, 'themis_start_run')({ task: 'assess perimeter' }))
  first.deps.close()

  const second = boot(file)   // simulated restart: fresh deps, same database
  const got = parse(await tool(second.server, 'themis_get_run')({ runId }))
  expect(got).toMatchObject({ runId, step: 'decompose', status: 'running' })
  const next = parse(await tool(second.server, 'themis_submit_step')({
    runId, step: 'decompose', output: { subTasks: [{ id: 's1', skill: 'attack-surface-mapping', description: 'enumerate' }] },
  }))
  expect(next.step).toBe('fanout')
  second.deps.close()
})

it('an approval proposed before a restart is never executed from stored (redacted) args', async () => {
  const file = path.join(dir, 'themis.db')
  const first = boot(file)
  const a = newApprovalRequest({ runId: 'r1', serverId: 'osint', tool: 'create_ticket', toolClass: 'write', args: { password: 'hunter2' }, reason: 'x' })
  first.deps.store.putApproval(a)
  first.deps.store.decideApproval(a.id, 'approved')   // the human said yes before the restart
  first.deps.close()

  const second = boot(file)
  const callServerTool = jest.fn(async () => ({ ok: true, text: 'done' }))
  const gw = (await import('@aegis-skills/themis-gateway')).createGateway({
    skill: 's', runId: 'r1', store: second.deps.store,
    servers: [{ id: 'osint', transport: 'http', url: 'https://mcp.example/osint', allowedSkills: ['s'], allowWrite: true, maxCalls: 1, timeoutMs: 1000 }],
    connector: { listServerTools: async () => [], callServerTool } as never,
  })
  const r = await gw.executeApproved(a.id)
  expect(r).toMatchObject({ kind: 'denied', reason: expect.stringMatching(/re-propose/) })
  expect(callServerTool).not.toHaveBeenCalled()
  second.deps.close()
})
