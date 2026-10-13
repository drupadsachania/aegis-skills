import { setup, tool, parse, toFanout } from './helpers'

it('drives a full run: start, decompose, staged fanout, guardrail, synthesise, completed', async () => {
  const { deps, server } = setup()
  let r = parse(await tool(server, 'themis_start_run')({ task: 'assess the external perimeter' }))
  expect(r.step).toBe('decompose')                       // validate auto-ran
  expect(r.prompt).toContain('Available skills: attack-surface-mapping')
  const runId = r.runId

  r = parse(await tool(server, 'themis_submit_step')({ runId, step: 'decompose', output: { subTasks: [
    { id: 's1', skill: 'attack-surface-mapping', description: 'enumerate hosts' },
    { id: 's2', skill: 'threat-modeling', description: 'model it', dependsOn: ['s1'] },
  ] } }))
  expect(r.step).toBe('fanout')                           // schedule auto-ran
  expect(r.ready.map((x: { id: string }) => x.id)).toEqual(['s1'])   // s2 waits for s1

  r = parse(await tool(server, 'themis_submit_step')({ runId, step: 'fanout', output: { results: [{ subTaskId: 's1', findings: 'found 3 hosts', confidence: 'high' }] } }))
  expect(r.step).toBe('fanout')                           // next stage: s2 is now ready
  expect(r.ready.map((x: { id: string }) => x.id)).toEqual(['s2'])

  r = parse(await tool(server, 'themis_submit_step')({ runId, step: 'fanout', output: { results: [{ subTaskId: 's2', findings: 'model done' }] } }))
  expect(r.step).toBe('guardrail')
  r = parse(await tool(server, 'themis_submit_step')({ runId, step: 'guardrail', output: { results: [
    { subTaskId: 's1', guardrail: 'PASS' }, { subTaskId: 's2', guardrail: 'FLAG', guardrailReason: 'detailed' } ] } }))
  expect(r.step).toBe('synthesise')
  expect(r.prompt).toContain('[FLAGGED: detailed]')

  r = parse(await tool(server, 'themis_submit_step')({ runId, step: 'synthesise', output: { report: 'perimeter mapped' } }))
  expect(r.status).toBe('completed')
  expect(r.report).toBe('perimeter mapped')
  expect(r.versions.themis).toBeTruthy()
  expect(r.versions.aegis).not.toBe('unknown')
  expect(deps.store.listAudit(runId).length).toBeGreaterThan(4)
  deps.close()
})

it('rejects a stale or out-of-order submit', async () => {
  const { deps, server } = setup()
  const { runId } = parse(await tool(server, 'themis_start_run')({ task: 'x' }))
  expect(parse(await tool(server, 'themis_submit_step')({ runId, step: 'guardrail', output: { results: [] } })).code).toBe('stale_step')
  deps.close()
})

it('returns bad_output (run unchanged) for schema and skill errors, and lets the host retry', async () => {
  const { deps, server } = setup()
  const { runId } = parse(await tool(server, 'themis_start_run')({ task: 'x' }))
  const submit = tool(server, 'themis_submit_step')
  expect(parse(await submit({ runId, step: 'decompose', output: { subTasks: 'nope' } })).code).toBe('bad_output')
  const unknownSkill = parse(await submit({ runId, step: 'decompose', output: { subTasks: [{ id: 'a', skill: 'made-up', description: 'd' }] } }))
  expect(unknownSkill.code).toBe('bad_output')
  expect(unknownSkill.error).toContain('Valid skills')
  expect(parse(await tool(server, 'themis_get_run')({ runId })).step).toBe('decompose')
  deps.close()
})

it('rejects a fanout that covers no ready sub-task, leaving the run retryable', async () => {
  const { deps, server } = setup()
  const { runId } = await toFanout(server)
  const bad = parse(await tool(server, 'themis_submit_step')({ runId, step: 'fanout', output: { results: [{ subTaskId: 'ghost', findings: 'x' }] } }))
  expect(bad.code).toBe('bad_output')
  expect(parse(await tool(server, 'themis_get_run')({ runId })).status).toBe('running')
  deps.close()
})

it('fails the run when the task is rejected by validation', async () => {
  const { deps, server } = setup()
  const r = parse(await tool(server, 'themis_start_run')({ task: '<script>x</script>' }))
  expect(r.status).toBe('failed')
  expect(parse(await tool(server, 'themis_submit_step')({ runId: r.runId, step: 'decompose', output: {} })).code).toBe('run_not_running')
  deps.close()
})

it('returns a structured error for an unknown runId and lists runs', async () => {
  const { deps, server } = setup()
  expect(parse(await tool(server, 'themis_get_run')({ runId: 'nope' })).code).toBe('no_such_run')
  await tool(server, 'themis_start_run')({ task: 'one' })
  expect(parse(await tool(server, 'themis_list_runs')({})).length).toBe(1)
  deps.close()
})
