jest.mock('@/lib/skill-reader', () => ({
  getPhaseContent: jest.fn(),
}))

import { getPhaseContent } from '@/lib/skill-reader'
const mockGetPhaseContent = getPhaseContent as jest.Mock

beforeEach(() => {
  mockGetPhaseContent.mockReset()
})

describe('fetchSkillPhaseTool', () => {
  it('returns phase content when skill-reader succeeds', async () => {
    mockGetPhaseContent.mockResolvedValue('## Phase content here')
    const { fetchSkillPhaseTool } = await import('@/lib/themis/graph/tools')
    const result = await fetchSkillPhaseTool.invoke({ skillName: 'mitre-attack', phaseId: 'recon' })
    expect(result).toBe('## Phase content here')
  })

  it('returns error string when skill-reader returns null (skill not found)', async () => {
    mockGetPhaseContent.mockResolvedValue(null)
    const { fetchSkillPhaseTool } = await import('@/lib/themis/graph/tools')
    const result = await fetchSkillPhaseTool.invoke({ skillName: 'unknown-skill', phaseId: '0' })
    expect(result).toContain('not found')
  })

  it('rejects phase content containing <script', async () => {
    mockGetPhaseContent.mockResolvedValue('<script>alert(1)</script>')
    const { fetchSkillPhaseTool } = await import('@/lib/themis/graph/tools')
    const result = await fetchSkillPhaseTool.invoke({ skillName: 'mitre-attack', phaseId: '0' })
    expect(result).toContain('failed integrity check')
  })

  it('rejects phase content exceeding 8000 chars', async () => {
    mockGetPhaseContent.mockResolvedValue('x'.repeat(8001))
    const { fetchSkillPhaseTool } = await import('@/lib/themis/graph/tools')
    const result = await fetchSkillPhaseTool.invoke({ skillName: 'mitre-attack', phaseId: '0' })
    expect(result).toContain('failed integrity check')
  })

  it('returns error string when skill-reader throws', async () => {
    mockGetPhaseContent.mockRejectedValue(new Error('disk error'))
    const { fetchSkillPhaseTool } = await import('@/lib/themis/graph/tools')
    const result = await fetchSkillPhaseTool.invoke({ skillName: 'mitre-attack', phaseId: '0' })
    expect(result).toContain('unavailable')
  })
})

describe('makeReadFindingsTool', () => {
  it('returns serialised findings from state for the requested skill', async () => {
    const { makeReadFindingsTool } = await import('@/lib/themis/graph/tools')
    const state = {
      subTaskResults: [
        { subTaskId: 'st-1', skill: 'mitre-attack', findings: 'APT29 recon findings', confidence: 'high', guardrail: 'PASS', inputTokens: 5, outputTokens: 10 },
        { subTaskId: 'st-2', skill: 'threat-modeling', findings: 'STRIDE threats', confidence: 'high', guardrail: 'PASS', inputTokens: 5, outputTokens: 10 },
      ],
    }
    const tool = makeReadFindingsTool(state as never)
    const result = await tool.invoke({ skill: 'mitre-attack' })
    expect(result).toContain('APT29 recon findings')
    expect(result).not.toContain('STRIDE threats')
  })

  it('returns "no findings" message when no results for that skill', async () => {
    const { makeReadFindingsTool } = await import('@/lib/themis/graph/tools')
    const state = { subTaskResults: [] }
    const tool = makeReadFindingsTool(state as never)
    const result = await tool.invoke({ skill: 'mitre-engage' })
    expect(result).toContain('No findings')
  })

  it('returns "all skills" results when skill is empty string', async () => {
    const { makeReadFindingsTool } = await import('@/lib/themis/graph/tools')
    const state = {
      subTaskResults: [
        { subTaskId: 'st-1', skill: 'mitre-attack', findings: 'recon', confidence: 'high', guardrail: 'PASS', inputTokens: 0, outputTokens: 0 },
        { subTaskId: 'st-2', skill: 'threat-modeling', findings: 'stride', confidence: 'high', guardrail: 'PASS', inputTokens: 0, outputTokens: 0 },
      ],
    }
    const tool = makeReadFindingsTool(state as never)
    const result = await tool.invoke({ skill: '' })
    expect(result).toContain('recon')
    expect(result).toContain('stride')
  })
})
