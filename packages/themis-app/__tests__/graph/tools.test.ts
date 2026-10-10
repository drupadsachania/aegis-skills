import fs from 'node:fs'
import path from 'node:path'
import { formatFindings, type SubTaskResult } from '@aegis-skills/themis-core'
import { useTempHome, makeSkillPack } from '../helpers/fixtures'
import { setAegisRootForTests } from '../../src/versions'
import { setConfigValue } from '../../src/config/config'
import { resolvePhaseId, loadPhase, fetchSkillPhaseTool, makeReadFindingsTool } from '../../src/graph/tools'

describe('graph skill tools', () => {
  useTempHome()
  let root = ''
  beforeEach(() => {
    root = makeSkillPack([{ name: 'compliance', phases: ['scope-definition', 'standard-mapping'] }])
    setAegisRootForTests(root)
  })
  afterEach(() => setAegisRootForTests(null))

  it('resolves 0-based indices to phase ids and passes ids through', () => {
    expect(resolvePhaseId('compliance', '1')).toBe('standard-mapping')
    expect(resolvePhaseId('compliance', 'scope-definition')).toBe('scope-definition')
  })
  it('loads phase text', () => {
    const r = loadPhase('compliance', 'scope-definition')
    expect(r.ok).toBe(true)
    expect(r.text).toContain('Methodology text')
  })
  it('reports a disabled skill', () => {
    setConfigValue('skills.disabled', '["compliance"]')
    const r = loadPhase('compliance', '0')
    expect(r.ok).toBe(false)
    expect(r.text).toContain('disabled')
  })
  it('reports a missing phase', () => {
    const r = loadPhase('compliance', 'nope')
    expect(r.ok).toBe(false)
    expect(r.text).toContain('not found')
  })
  it('rejects phase content that fails the integrity check', () => {
    fs.writeFileSync(path.join(root, 'skills', 'compliance', 'references', 'scope-definition.md'), '<script>alert(1)</script>')
    const r = loadPhase('compliance', 'scope-definition')
    expect(r.ok).toBe(false)
    expect(r.text).toContain('failed integrity check')
  })
  it('fetch_skill_phase returns the methodology', async () => {
    const out = await fetchSkillPhaseTool.invoke({ skillName: 'compliance', phaseId: '0' })
    expect(out).toContain('Methodology text')
  })
  it('read_findings returns core formatFindings', async () => {
    const r: SubTaskResult = { subTaskId: 'a', skill: 'compliance', findings: 'F', confidence: 'high', guardrail: 'PASS', inputTokens: 0, outputTokens: 0 }
    expect(await makeReadFindingsTool([r]).invoke({ skill: '' })).toBe(formatFindings([r], ''))
  })
})
