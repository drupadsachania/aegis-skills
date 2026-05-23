const { generateManifest, validateManifest } = require('../src/manifest')

const BASE_URL = 'https://skills.openskill.ai'

const mockSkill = {
  name: 'test-skill',
  version: '1.0.0',
  description: 'A minimal test skill for compiler validation.',
  frameworks: ['mitre-attack'],
  tags: ['test'],
  phases: [
    { id: 'phase-zero', lazy: true, tokens: 80 }
  ],
  research: { feeds: ['mitre-attack'], 'red-team': false }
}

describe('generateManifest', () => {
  let manifest

  beforeAll(() => {
    manifest = generateManifest(mockSkill, BASE_URL)
  })

  test('sets osk version to 1.0', () => {
    expect(manifest.osk).toBe('1.0')
  })

  test('copies name, version, description', () => {
    expect(manifest.name).toBe('test-skill')
    expect(manifest.version).toBe('1.0.0')
    expect(manifest.description).toMatch(/minimal test skill/)
  })

  test('includes phases with token counts', () => {
    expect(manifest.phases[0].id).toBe('phase-zero')
    expect(manifest.phases[0].tokens).toBe(80)
    expect(manifest.phases[0].lazy).toBe(true)
  })

  test('generates correct endpoints', () => {
    expect(manifest.endpoints.mcp).toBe('mcp://skills.openskill.ai/test-skill')
    expect(manifest.endpoints.action).toBe('https://skills.openskill.ai/test-skill/invoke')
    expect(manifest.endpoints.artifacts).toBe('https://skills.openskill.ai/test-skill/download')
  })

  test('does not include phase content in manifest', () => {
    expect(JSON.stringify(manifest)).not.toContain('reference content')
  })

  test('does not include ref key when phase has no ref', () => {
    // mockSkill.phases[0] has no ref field
    const manifest = generateManifest(mockSkill, BASE_URL)
    expect(Object.prototype.hasOwnProperty.call(manifest.phases[0], 'ref')).toBe(false)
  })

  test('strips ref path from manifest output for security', () => {
    const skillWithRef = {
      ...mockSkill,
      phases: [{ id: 'phase-zero', lazy: true, tokens: 80, ref: 'references/phase-zero.md' }]
    }
    const manifest = generateManifest(skillWithRef, BASE_URL)
    expect(Object.prototype.hasOwnProperty.call(manifest.phases[0], 'ref')).toBe(false)
  })
})

describe('validateManifest', () => {
  test('passes for valid manifest', () => {
    const manifest = generateManifest(mockSkill, BASE_URL)
    expect(() => validateManifest(manifest)).not.toThrow()
  })

  test('throws for missing required field', () => {
    expect(() => validateManifest({ osk: '1.0', name: 'x' })).toThrow('Invalid skill.json')
  })
})

describe('generateManifest — optional metadata blocks', () => {
  test('passes self-learning block through when present', () => {
    const skill = {
      name: 'test-skill',
      version: '1.0.0',
      description: 'A minimal test skill for compiler validation.',
      frameworks: [],
      tags: [],
      phases: [{ id: 'p1', lazy: false, tokens: 10 }],
      'self-learning': {
        'update-frequency': 'weekly',
        sources: ['mitre-attack-stix', 'nvd-cve-feed'],
        'health-score': 1.0,
        'stale-threshold-days': 90,
        'coverage-gaps': []
      }
    }
    const manifest = generateManifest(skill, 'https://project-iud7o.vercel.app')
    expect(manifest['self-learning']).toBeDefined()
    expect(manifest['self-learning']['update-frequency']).toBe('weekly')
    expect(manifest['self-learning']['health-score']).toBe(1.0)
    expect(manifest['self-learning'].sources).toContain('mitre-attack-stix')
  })

  test('passes context block through when present', () => {
    const skill = {
      name: 'test-skill',
      version: '1.0.0',
      description: 'A minimal test skill for compiler validation.',
      frameworks: [],
      tags: [],
      phases: [{ id: 'p1', lazy: false, tokens: 10 }],
      context: {
        environments: ['enterprise', 'cloud'],
        'industry-verticals': ['financial-services'],
        'attack-surface-tags': ['network', 'endpoint']
      }
    }
    const manifest = generateManifest(skill, 'https://project-iud7o.vercel.app')
    expect(manifest.context).toBeDefined()
    expect(manifest.context.environments).toContain('enterprise')
    expect(manifest.context['attack-surface-tags']).toContain('network')
  })

  test('omits self-learning when absent from skill', () => {
    const skill = {
      name: 'test-skill',
      version: '1.0.0',
      description: 'A minimal test skill for compiler validation.',
      frameworks: [],
      tags: [],
      phases: [{ id: 'p1', lazy: false, tokens: 10 }]
    }
    const manifest = generateManifest(skill, 'https://project-iud7o.vercel.app')
    expect(manifest['self-learning']).toBeUndefined()
  })

  test('omits context when absent from skill', () => {
    const skill = {
      name: 'test-skill',
      version: '1.0.0',
      description: 'A minimal test skill for compiler validation.',
      frameworks: [],
      tags: [],
      phases: [{ id: 'p1', lazy: false, tokens: 10 }]
    }
    const manifest = generateManifest(skill, 'https://project-iud7o.vercel.app')
    expect(manifest.context).toBeUndefined()
  })

  test('validates manifest with self-learning and context', () => {
    const skill = {
      name: 'test-skill',
      version: '1.0.0',
      description: 'A minimal test skill for compiler validation.',
      frameworks: [],
      tags: [],
      phases: [{ id: 'p1', lazy: false, tokens: 10 }],
      'self-learning': {
        'update-frequency': 'weekly',
        sources: ['mitre-attack-stix'],
        'health-score': 0.95,
        'stale-threshold-days': 90,
        'coverage-gaps': []
      },
      context: {
        environments: ['enterprise'],
        'industry-verticals': ['financial-services'],
        'attack-surface-tags': ['network']
      }
    }
    const manifest = generateManifest(skill, 'https://project-iud7o.vercel.app')
    expect(() => validateManifest(manifest)).not.toThrow()
  })
})
