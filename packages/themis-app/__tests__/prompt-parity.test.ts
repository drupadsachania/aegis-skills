// Parity contract for Phase 2: captures the exact arguments of every model call
// made by the web Themis modules. Written BEFORE prompts move into themis-core.
// Never update this snapshot with -u during Phase 2: a diff means a prompt changed.

jest.mock('../src/providers/llm', () => ({
  llm: jest.fn(),
  availableProviders: jest.fn(() => ['anthropic']),
}))
jest.mock('../src/skills/aegis', () => ({ enabledSkillSlugs: jest.fn(() => ['mitre-attack', 'threat-modeling']) }))

import { llm } from '../src/providers/llm'
import { decompose } from '../src/reasoning/decompose'
import { applyGuardrail } from '../src/reasoning/guardrail'
import { synthesise } from '../src/reasoning/synthesise'
import { ingest as auditIngest } from '../src/pipelines/audit/ingest'
import { assess } from '../src/pipelines/audit/assessor'
import { report as auditReport } from '../src/pipelines/audit/reporter'
import { ingest as exposureIngest } from '../src/pipelines/exposure/ingest'
import { correlate } from '../src/pipelines/exposure/correlate'
import { plan } from '../src/pipelines/exposure/planner'
import { assessImpact } from '../src/pipelines/exposure/attackpath'
import { report as exposureReport } from '../src/pipelines/exposure/report'

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
})

it('decompose', async () => {
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
