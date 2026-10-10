import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { setup } from './helpers'

const text = (r: unknown) => JSON.parse((r as { content: { text: string }[] }).content[0].text)

async function connect() {
  const { deps, server } = setup()
  const [clientT, serverT] = InMemoryTransport.createLinkedPair()
  await server.connect(serverT)
  const client = new Client({ name: 'test-host', version: '0' }, { capabilities: {} })
  await client.connect(clientT)
  return { deps, client, close: async () => { await client.close(); deps.close() } }
}

it('runs end to end over MCP and stamps versions', async () => {
  const { client, close } = await connect()
  const call = async (name: string, args: Record<string, unknown>) => text(await client.callTool({ name, arguments: args }))

  const { tools } = await client.listTools()
  expect(tools.map((t) => t.name)).toEqual(expect.arrayContaining(['themis_start_run', 'themis_submit_step', 'themis_external_call']))

  let r = await call('themis_start_run', { task: 'assess perimeter', context: { environments: ['web'] } })
  const runId = r.runId
  r = await call('themis_submit_step', { runId, step: 'decompose', output: { subTasks: [{ id: 's1', skill: 'attack-surface-mapping', description: 'enumerate' }] } })
  r = await call('themis_submit_step', { runId, step: 'fanout', output: { results: [{ subTaskId: 's1', findings: 'ok', confidence: 'medium' }] } })
  r = await call('themis_submit_step', { runId, step: 'guardrail', output: { results: [{ subTaskId: 's1', guardrail: 'PASS' }] } })
  r = await call('themis_submit_step', { runId, step: 'synthesise', output: { report: 'done' } })
  expect(r.status).toBe('completed')
  expect(r.versions.themis).toBeTruthy()
  expect(r.versions.aegis).not.toBe('unknown')

  const rep = await call('themis_get_report', { runId })
  expect(rep).toMatchObject({ status: 'completed', report: 'done' })
  await close()
})

it('rejects malformed tool arguments at the protocol level', async () => {
  const { client, close } = await connect()
  const res = await client.callTool({ name: 'themis_start_run', arguments: { task: '' } })
  expect(res.isError).toBe(true)
  await close()
})
