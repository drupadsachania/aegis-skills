jest.mock('@/lib/skill-reader', () => ({
  getPhaseContent: jest.fn(),
}))

import { getPhaseContent } from '@/lib/skill-reader'
import { fetchSkillPhaseTool, makeReadFindingsTool } from '@/lib/themis/graph/tools'
import type { SubTaskResult } from '@/lib/themis/types'

const mockGetPhaseContent = getPhaseContent as jest.Mock

beforeEach(() => {
  mockGetPhaseContent.mockReset()
})

describe('fetchSkillPhaseTool', () => {
  it('returns phase content when skill-reader succeeds', async () => {
    mockGetPhaseContent.mockResolvedValue('## Phase content here')
    const result = await fetchSkillPhaseTool.invoke({ skillName: 'mitre-attack', phaseId: 'recon' })
    expect(result).toBe('## Phase content here')
  })

  it('returns error string when skill-reader returns null (skill not found)', async () => {
    mockGetPhaseContent.mockResolvedValue(null)
    const result = await fetchSkillPhaseTool.invoke({ skillName: 'unknown-skill', phaseId: '0' })
    expect(result).toContain('not found')
  })

  it('rejects phase content containing <script', async () => {
    mockGetPhaseContent.mockResolvedValue('<script>alert(1)</script>')
    const result = await fetchSkillPhaseTool.invoke({ skillName: 'mitre-attack', phaseId: '0' })
    expect(result).toContain('failed integrity check')
  })

  it('rejects phase content exceeding 8000 chars', async () => {
    mockGetPhaseContent.mockResolvedValue('x'.repeat(8001))
    const result = await fetchSkillPhaseTool.invoke({ skillName: 'mitre-attack', phaseId: '0' })
    expect(result).toContain('failed integrity check')
  })

  it('returns error string when skill-reader throws', async () => {
    mockGetPhaseContent.mockRejectedValue(new Error('disk error'))
    const result = await fetchSkillPhaseTool.invoke({ skillName: 'mitre-attack', phaseId: '0' })
    expect(result).toContain('unavailable')
  })
})

describe('makeReadFindingsTool', () => {
  const makeResult = (subTaskId: string, skill: string, findings: string): SubTaskResult => ({
    subTaskId,
    skill,
    findings,
    confidence: 'high',
    guardrail: 'PASS',
    inputTokens: 5,
    outputTokens: 10,
  })

  it('returns serialised findings from state for the requested skill', async () => {
    const state = {
      subTaskResults: [
        makeResult('st-1', 'mitre-attack', 'APT29 recon findings'),
        makeResult('st-2', 'threat-modeling', 'STRIDE threats'),
      ],
    }
    const tool = makeReadFindingsTool(state)
    const result = await tool.invoke({ skill: 'mitre-attack' })
    expect(result).toContain('APT29 recon findings')
    expect(result).not.toContain('STRIDE threats')
  })

  it('returns "no findings" message when no results for that skill', async () => {
    const state = { subTaskResults: [] }
    const tool = makeReadFindingsTool(state)
    const result = await tool.invoke({ skill: 'mitre-engage' })
    expect(result).toContain('No findings')
  })

  it('returns "all skills" results when skill is empty string', async () => {
    const state = {
      subTaskResults: [
        makeResult('st-1', 'mitre-attack', 'recon'),
        makeResult('st-2', 'threat-modeling', 'stride'),
      ],
    }
    const tool = makeReadFindingsTool(state)
    const result = await tool.invoke({ skill: '' })
    expect(result).toContain('recon')
    expect(result).toContain('stride')
  })
})
