import { createMemoryStore, skillAgentSystemPrompt, skillAgentUserMessage, type SubTask } from '@aegis-skills/themis-core'
import { useTempHome, makeSkillPack } from '../helpers/fixtures'
import { ScriptedChatModel, contentOf, systemText, text, type Script } from '../helpers/scripted-model'
import { fakeGatewayFactory } from '../helpers/fake-gateway'
import { standardScript } from '../helpers/test-deps'
import { setAegisRootForTests } from '../../src/versions'
import { setChatModelFactoryForTests } from '../../src/providers/models'
import { withProvider } from '../../src/providers/llm'
import { setConfigValue } from '../../src/config/config'
import { KeyStore } from '../../src/config/keys'
import { RunGateways } from '../../src/graph/run-gateways'
import { runSkillAgent, type SkillAgentDeps, type ToolMode } from '../../src/graph/skill-agent'
import { NO_TOOLS_NOTE } from '../../src/graph/no-tools-prompt'
import type { ProviderId } from '../../src/providers/catalog'

const sub: SubTask = { id: 'a', description: 'Check controls TICKET', skill: 'compliance', phase: 0, dependsOn: [], tier: 'fast' } as SubTask
const PLAN = [{ id: 'a', description: 'Check controls TICKET', skill: 'compliance', phase: 0, dependsOn: [] as string[] }]

describe('runSkillAgent', () => {
  useTempHome()
  const store = createMemoryStore()
  let model: ScriptedChatModel
  let fake: ReturnType<typeof fakeGatewayFactory>
  let gateways: RunGateways
  let approvals: string[]
  let notices: string[]
  let deps: SkillAgentDeps

  function setup(script: Script): void {
    model = new ScriptedChatModel(script)
    setChatModelFactoryForTests(() => model)
  }
  const run = (mode: ToolMode = 'tools', provider: ProviderId = 'anthropic') =>
    withProvider(provider, () => runSkillAgent({ runId: 'r1', provider, mode, subTask: sub, priorResults: [] }, deps))

  beforeEach(() => {
    setAegisRootForTests(makeSkillPack([{ name: 'compliance', phases: ['scope-definition'] }, { name: 'threat-modeling', phases: ['dfd'] }]))
    new KeyStore().set('anthropic', 'sk-ant-test-000000')
    fake = fakeGatewayFactory(store)
    gateways = new RunGateways(fake.factory)
    approvals = []
    notices = []
    deps = {
      gateways,
      onApproval: (_r, id) => approvals.push(id),
      onNotice: (_r, m) => notices.push(m),
    }
  })
  afterEach(() => { setChatModelFactoryForTests(null); setAegisRootForTests(null) })

  it('tools mode: a write tool files a pending approval and the agent carries on', async () => {
    setup(standardScript({ plan: PLAN, toolCall: { when: /TICKET/, name: 'themis__fake__create_ticket', args: { title: 't' } } }))
    const out = await run()
    expect(out.result.findings.startsWith('FINDINGS:')).toBe(true)
    const pending = store.listApprovals({ runId: 'r1', status: 'pending' })
    expect(pending).toHaveLength(1)
    expect(out.approvalSkills[pending[0].id]).toBe('compliance')
    expect(approvals).toEqual([pending[0].id])
    expect(gateways.holdsArgs(pending[0].id)).toBe(true)
  })

  it('tools mode: a read tool result is fed back to the model', async () => {
    setup(standardScript({ plan: PLAN, toolCall: { when: /TICKET/, name: 'themis__fake__lookup_host', args: { host: 'h' } } }))
    await run()
    const second = model.calls[1]
    const tool = second.find((m) => m._getType() === 'tool')
    expect(contentOf(tool)).toContain('203.0.113.1')
  })

  it('uses the core prompts', async () => {
    setup(standardScript({ plan: PLAN }))
    await run()
    const first = model.calls[0]
    expect(systemText(first)).toBe(skillAgentSystemPrompt())
    expect(contentOf(first.find((m) => m._getType() === 'human'))).toBe(skillAgentUserMessage(sub))
  })

  it('no-tools mode: methodology in the prompt, no external tools listed', async () => {
    setConfigValue('local.model', 'llama3.1:8b')
    setup(standardScript({ plan: PLAN }))
    await run('no-tools', 'local')
    const human = contentOf(model.calls[0].find((m) => m._getType() === 'human'))
    expect(human).toContain('<methodology>')
    expect(human).toContain('Methodology text')
    expect(human).toContain(NO_TOOLS_NOTE)
    expect(fake.log.listed).toBe(0)
  })

  it('falls back to no-tools when the model rejects tools at runtime', async () => {
    const inner = standardScript({ plan: PLAN })
    setup((m, i) => { if (i === 0) throw new Error('400 tools are not supported by this model'); return inner(m, i) })
    const out = await run()
    expect(notices.some((n) => n.includes('ran without tools'))).toBe(true)
    expect(out.result.confidence).toBe('medium')
  })

  it('a generic failure yields a low-confidence FLAG result', async () => {
    setup(standardScript({ plan: PLAN, failAgentsWith: new Error('boom') }))
    const out = await run()
    expect(out.result.confidence).toBe('low')
    expect(out.result.guardrail).toBe('FLAG')
  })

  it('redacts secrets in model output', async () => {
    setup(() => text('found key AKIAIOSFODNN7EXAMPLE in config'))
    const out = await run()
    expect(out.result.findings).not.toContain('AKIAIOSFODNN7EXAMPLE')
  })

})
