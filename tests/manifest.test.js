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
