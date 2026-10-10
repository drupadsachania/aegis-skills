// Parity contract for Phase 2: captures the exact arguments of every model call
// made by the web Themis modules. Written BEFORE prompts move into themis-core.
// Never update this snapshot with -u during Phase 2: a diff means a prompt changed.

jest.mock('@/lib/themis/provider', () => ({
  llm: jest.fn(),
  availableProviders: jest.fn(() => ['anthropic']),
}))
jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn(() => null) }))
jest.mock('@/lib/themis/llm-factory', () => ({ modelForTier: jest.fn(() => ({})) }))
jest.mock('@langchain/langgraph/prebuilt', () => ({
  createReactAgent: jest.fn(() => ({
    invoke: jest.fn().mockResolvedValue({ messages: [{ content: 'agent findings' }] }),
  })),
}))

import { llm } from '@/lib/themis/provider'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { decompose } from '@/lib/themis/decompose'
import { applyGuardrail } from '@/lib/themis/guardrail'
import { synthesise } from '@/lib/themis/synthesise'
import { skillAgentNode } from '@/lib/themis/graph/nodes'
import { ingest as auditIngest } from '@/lib/themis/audit/ingest'
import { assess } from '@/lib/themis/audit/assessor'
import { report as auditReport } from '@/lib/themis/audit/reporter'
import { ingest as exposureIngest } from '@/lib/themis/exposure/ingest'
import { correlate } from '@/lib/themis/exposure/correlate'
import { plan } from '@/lib/themis/exposure/planner'
import { assessImpact } from '@/lib/themis/exposure/attackpath'
import { report as exposureReport } from '@/lib/themis/exposure/report'

const mockLlm = llm as jest.MockedFunction<typeof llm>
const resp = (content: string) => ({
  content, model: 't', provider: 'anthropic' as const, inputTokens: 1, outputTokens: 1, latencyMs: 1,
})
const calls = () => mockLlm.mock.calls.map((c) => c[0])

const result = {
  subTaskId: 'st-1', skill: 'mitre-attack', findings: 'Port 22 open on bastion.',
  confidence: 'high' as const, guardrail: 'PASS' as const, inputTokens: 1, outputTokens: 1,
}
const auditReq: Parameters<typeof auditIngest>[0] = {
  input: 'PermitRootLogin yes', inputType: 'config', standards: [], context: { environments: [] },
}
const exposureReq: Parameters<typeof correlate>[2] = {
  input: 'nginx 1.20 internet-facing',
  cve: 'CVE-2099-0001',
  authorization: { authorized: true, scopeConfirmed: true, targetIdentityVerified: true },
  context: { assetId: 'web-01', systemType: 'linux-server', environments: ['cloud'], crownJewel: false },
}

beforeEach(() => {
  mockLlm.mockReset()
  ;(createReactAgent as jest.Mock).mockClear()
})

it('decompose', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true, json: async () => ({ skills: [{ name: 'mitre-attack' }, { name: 'threat-modeling' }] }),
  }) as unknown as typeof fetch
  mockLlm.mockResolvedValue(resp('[]'))
  await decompose({ task: 'Assess the bastion host', context: { environments: [], attackSurfaceTags: [] } })
  expect(calls()).toMatchSnapshot()
})

it('guardrail', async () => {
  mockLlm.mockResolvedValue(resp('{"verdict":"PASS"}'))
  await applyGuardrail(result)
  expect(calls()).toMatchSnapshot()
})

it('synthesise', async () => {
  mockLlm.mockResolvedValue(resp('report'))
  await synthesise('task', [result, { ...result, subTaskId: 'st-2', guardrail: 'FLAG', guardrailReason: 'too detailed' }])
  expect(calls()).toMatchSnapshot()
})

it('skill agent', async () => {
  await skillAgentNode({
    currentSubTask: { id: 'st-1', description: 'Map exposed services', skill: 'mitre-attack', phase: 1, tier: 'fast', dependsOn: [] },
    subTaskResults: [],
    provider: 'anthropic',
  } as never)
  const mock = createReactAgent as jest.Mock
  const opts = mock.mock.calls[0][0]
  const invokeArg = mock.mock.results[0].value.invoke.mock.calls[0][0]
  expect({ system: opts.stateModifier.content, invoke: invokeArg }).toMatchSnapshot()
})

it('audit ingest', async () => {
  mockLlm.mockResolvedValue(resp('{"systemType":"linux-server","applicableSkills":[]}'))
  await auditIngest(auditReq)
  expect(calls()).toMatchSnapshot()
})

it('audit assess', async () => {
  mockLlm.mockResolvedValue(resp('[]'))
  await assess('PermitRootLogin yes', ['cis-l1', 'hipaa'], [], { environments: [] })
  expect(calls()).toMatchSnapshot()
})

it('audit report', async () => {
  mockLlm.mockResolvedValue(resp('summary'))
  await auditReport(auditReq, [{
    controlId: 'CIS-5.2.8', standard: 'cis-l1', severity: 'high', title: 'Root login',
    evidence: 'PermitRootLogin yes', recommendation: 'Disable it', reference: 'CIS 5.2.8',
  }], ['cis-l1'], ['compliance'])
  expect(calls()).toMatchSnapshot()
})

it('exposure ingest', async () => {
  mockLlm.mockResolvedValue(resp('{"systemType":"linux-server","affectedProduct":"nginx","applicableSkills":[]}'))
  await exposureIngest(exposureReq)
  expect(calls()).toMatchSnapshot()
})

it('exposure correlate', async () => {
  mockLlm.mockResolvedValue(resp('{"exposure":"POTENTIAL_EXPOSURE"}'))
  await correlate('nginx 1.20', 'nginx', exposureReq)
  expect(calls()).toMatchSnapshot()
})

it('exposure planner', async () => {
  mockLlm.mockResolvedValue(resp('{}'))
  await plan('prove reachability', 'nginx 1.20', { decision: 'ALLOW', reasons: [], highestDepthPermitted: 'LOW_IMPACT' })
  expect(calls()).toMatchSnapshot()
})

it('exposure attack path', async () => {
  mockLlm.mockResolvedValue(resp('{"impact":"UNKNOWN"}'))
  await assessImpact('nginx 1.20', exposureReq)
  expect(calls()).toMatchSnapshot()
})

it('exposure report', async () => {
  mockLlm.mockResolvedValue(resp('summary'))
  const input: Parameters<typeof exposureReport>[0] = {
    case: {
      caseId: 'exp-1', workflowState: 'VALIDATION_PENDING',
      states: { exposure: 'POTENTIAL_EXPOSURE', exploitability: 'NOT_VALIDATED', impact: 'UNKNOWN', detection: 'NOT_TESTED', remediation: 'NONE', verification: 'NOT_VERIFIED' },
      exploitabilityConfidence: 'unknown', validationFailure: 'NO_EXECUTION_LAYER',
    },
    plan: { claim: 'c', steps: [], depth: 'PASSIVE', requiresApproval: false, approvalRequirements: [], blocked: false },
    impact: { state: 'UNKNOWN', path: [], reachesCrownJewel: false, notes: '' },
    risk: {
      before: { score: 40, band: 'medium', factors: { threatLikelihood: 0.3, exposure: 0.6, exploitability: 0.5, businessCriticality: 0.5, attackPathImpact: 0.5, controlWeakness: 0.6 }, confidence: 'low', rationale: [] },
      after: null, delta: null, proven: false,
    },
    correlationRationale: 'r',
  }
  await exposureReport(input)
  expect(calls()).toMatchSnapshot()
})
