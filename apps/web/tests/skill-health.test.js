'use strict'

// Mirror the internal functions for unit testing
const {
  extractAttackTechniques,
  extractCveKeywords,
  scoreSkill
} = (() => {
  function extractAttackTechniques(stixBundle) {
    const techniques = []
    for (const obj of (stixBundle.objects || [])) {
      if (obj.type !== 'attack-pattern') continue
      const extRef = (obj.external_references || []).find(r => r.source_name === 'mitre-attack')
      if (!extRef) continue
      techniques.push({ id: extRef.external_id, name: obj.name, description: '' })
    }
    return techniques
  }

  function extractCveKeywords(nvdResponse) {
    const keywords = new Set()
    for (const item of (nvdResponse.vulnerabilities || [])) {
      const cve = item.cve
      if (!cve) continue
      keywords.add(cve.id)
      for (const config of (cve.configurations || [])) {
        for (const node of (config.nodes || [])) {
          for (const match of (node.cpeMatch || [])) {
            const parts = (match.criteria || '').split(':')
            if (parts.length > 4) { keywords.add(parts[3]); keywords.add(parts[4]) }
          }
        }
      }
    }
    return keywords
  }

  function scoreSkill(skill, phaseContents, attackTechniques, cveKeywords) {
    const allContent = phaseContents.join('\n').toLowerCase()
    const relevantTechniques = attackTechniques.filter(t => {
      const frameworks = skill.frameworks || []
      if (frameworks.includes('mitre-attack') || frameworks.includes('mitre-engage')) return true
      const tags = (skill.tags || []).join(' ').toLowerCase()
      return t.name.toLowerCase().split(' ').some(word => tags.includes(word))
    })
    let attackCoverage = 1.0
    if (relevantTechniques.length > 0) {
      const covered = relevantTechniques.filter(t => {
        const tid = t.id.toLowerCase()
        const tname = t.name.toLowerCase().replace(/[^a-z0-9\s]/g, '')
        return allContent.includes(tid) || tname.split(' ').some(w => w.length > 4 && allContent.includes(w))
      })
      const ratio = covered.length / relevantTechniques.length
      attackCoverage = Math.min(1.0, ratio + 0.3)
    }
    const cveMentioned = [...cveKeywords].filter(kw => kw.length > 3 && allContent.includes(kw.toLowerCase()))
    const cveScore = Math.min(1.0, 0.7 + (cveMentioned.length > 0 ? 0.3 : 0))
    const phaseScore = Math.min(1.0, (skill.phases || []).length / 5)
    const healthScore = Math.round((attackCoverage * 0.5 + cveScore * 0.3 + phaseScore * 0.2) * 100) / 100
    return {
      'health-score': healthScore,
      'attack-coverage': Math.round(attackCoverage * 100) / 100,
      'cve-freshness': Math.round(cveScore * 100) / 100,
      'phase-coverage': Math.round(phaseScore * 100) / 100,
      'relevant-techniques-count': relevantTechniques.length
    }
  }

  return { extractAttackTechniques, extractCveKeywords, scoreSkill }
})()

describe('extractAttackTechniques', () => {
  test('extracts technique IDs and names from STIX bundle', () => {
    const bundle = {
      objects: [
        {
          type: 'attack-pattern',
          name: 'Valid Accounts',
          description: 'Adversaries may obtain and abuse credentials.',
          external_references: [{ source_name: 'mitre-attack', external_id: 'T1078' }]
        },
        {
          type: 'course-of-action',
          name: 'Not a technique',
          external_references: [{ source_name: 'mitre-attack', external_id: 'M1036' }]
        }
      ]
    }
    const techniques = extractAttackTechniques(bundle)
    expect(techniques).toHaveLength(1)
    expect(techniques[0].id).toBe('T1078')
    expect(techniques[0].name).toBe('Valid Accounts')
  })

  test('returns empty array for empty bundle', () => {
    expect(extractAttackTechniques({ objects: [] })).toEqual([])
    expect(extractAttackTechniques({})).toEqual([])
  })
})

describe('extractCveKeywords', () => {
  test('extracts CVE IDs from NVD response', () => {
    const nvd = {
      vulnerabilities: [
        { cve: { id: 'CVE-2024-21762', configurations: [] } },
        { cve: { id: 'CVE-2024-12345', configurations: [] } }
      ]
    }
    const keywords = extractCveKeywords(nvd)
    expect(keywords.has('CVE-2024-21762')).toBe(true)
    expect(keywords.has('CVE-2024-12345')).toBe(true)
  })

  test('returns empty set for empty response', () => {
    expect(extractCveKeywords({ vulnerabilities: [] }).size).toBe(0)
    expect(extractCveKeywords({}).size).toBe(0)
  })
})

describe('scoreSkill', () => {
  const mockTechniques = [
    { id: 'T1078', name: 'Valid Accounts', description: '' },
    { id: 'T1046', name: 'Network Service Discovery', description: '' },
    { id: 'T1021', name: 'Remote Services', description: '' }
  ]

  test('returns health-score between 0 and 1', () => {
    const skill = {
      name: 'test', version: '1.0.0', frameworks: ['mitre-attack'],
      tags: ['security'], phases: [{ id: 'p1' }, { id: 'p2' }]
    }
    const result = scoreSkill(skill, ['T1078 valid accounts remote services'], mockTechniques, new Set())
    expect(result['health-score']).toBeGreaterThanOrEqual(0)
    expect(result['health-score']).toBeLessThanOrEqual(1)
  })

  test('scores higher when technique IDs are present in content', () => {
    const skill = {
      name: 'test', version: '1.0.0', frameworks: ['mitre-attack'],
      tags: [], phases: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }, { id: 'p5' }]
    }
    const highScore = scoreSkill(skill, ['T1078 T1046 T1021 valid accounts remote services'], mockTechniques, new Set(['fortinet']))
    const lowScore = scoreSkill(skill, ['unrelated content about nothing'], mockTechniques, new Set())
    expect(highScore['health-score']).toBeGreaterThan(lowScore['health-score'])
  })

  test('includes relevant-techniques-count in output', () => {
    const skill = { name: 'test', version: '1.0.0', frameworks: ['mitre-attack'], tags: [], phases: [] }
    const result = scoreSkill(skill, ['content'], mockTechniques, new Set())
    expect(result['relevant-techniques-count']).toBe(3)
  })

  test('gives full attack-coverage when no relevant techniques', () => {
    const skill = { name: 'test', version: '1.0.0', frameworks: ['cis-benchmarks'], tags: [], phases: [] }
    const result = scoreSkill(skill, ['content'], mockTechniques, new Set())
    expect(result['attack-coverage']).toBe(1.0)
  })

  test('cve-freshness is 1.0 when CVE product keywords found in content', () => {
    const skill = { name: 'test', version: '1.0.0', frameworks: [], tags: [], phases: [] }
    const cveKeywords = new Set(['fortinet', 'fortigate'])
    const result = scoreSkill(skill, ['fortigate firewall hardening'], [], cveKeywords)
    expect(result['cve-freshness']).toBe(1.0)
  })
})
