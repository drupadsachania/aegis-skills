'use strict'

jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn(),
    realpath: jest.fn()
  }
}))

const fs = require('fs').promises
const { listSkills, getSkillManifest, getPhaseContent } = require('../lib/skill-reader')

const MOCK_MANIFEST = {
  osk: '1.0',
  name: 'test-skill',
  version: '1.0.0',
  description: 'A test skill for unit testing.',
  frameworks: ['mitre-attack'],
  tags: ['test'],
  phases: [
    { id: 'phase-one', lazy: true, tokens: 100, ref: 'references/phase-one.md' }
  ],
  endpoints: {
    mcp: 'mcp://skills.openskill.ai/test-skill',
    action: 'https://skills.openskill.ai/test-skill/invoke',
    artifacts: 'https://skills.openskill.ai/test-skill/download'
  }
}

describe('listSkills', () => {
  beforeEach(() => jest.clearAllMocks())

  test('returns skill summaries for all skill directories', async () => {
    fs.readdir.mockResolvedValue([
      { name: 'test-skill', isDirectory: () => true }
    ])
    fs.readFile.mockResolvedValue(JSON.stringify(MOCK_MANIFEST))

    const skills = await listSkills()
    expect(skills).toHaveLength(1)
    expect(skills[0].name).toBe('test-skill')
    expect(skills[0].version).toBe('1.0.0')
    expect(skills[0].phases).toBe(1)
  })

  test('returns empty array when skills directory does not exist', async () => {
    fs.readdir.mockRejectedValue(new Error('ENOENT'))
    const skills = await listSkills()
    expect(skills).toEqual([])
  })

  test('skips non-directory entries', async () => {
    fs.readdir.mockResolvedValue([
      { name: 'test-skill', isDirectory: () => true },
      { name: 'README.md', isDirectory: () => false }
    ])
    fs.readFile.mockResolvedValue(JSON.stringify(MOCK_MANIFEST))
    const skills = await listSkills()
    expect(skills).toHaveLength(1)
  })

  test('skips directories with no skill.json', async () => {
    fs.readdir.mockResolvedValue([
      { name: 'test-skill', isDirectory: () => true }
    ])
    fs.readFile.mockRejectedValue(new Error('ENOENT'))
    const skills = await listSkills()
    expect(skills).toEqual([])
  })
})

describe('getSkillManifest', () => {
  beforeEach(() => jest.clearAllMocks())

  test('returns parsed manifest for a known skill', async () => {
    fs.readFile.mockResolvedValue(JSON.stringify(MOCK_MANIFEST))
    const manifest = await getSkillManifest('test-skill')
    expect(manifest.name).toBe('test-skill')
    expect(manifest.phases[0].ref).toBe('references/phase-one.md')
  })

  test('returns null for an unknown skill', async () => {
    fs.readFile.mockRejectedValue(new Error('ENOENT'))
    const manifest = await getSkillManifest('nonexistent')
    expect(manifest).toBeNull()
  })
})

describe('getPhaseContent', () => {
  beforeEach(() => jest.clearAllMocks())

  test('returns phase markdown for a valid skill and phase', async () => {
    fs.readFile
      .mockResolvedValueOnce(JSON.stringify(MOCK_MANIFEST))
      .mockResolvedValueOnce('# Phase One\n\nContent here.')
    // realpath resolves to the same path (no symlinks)
    fs.realpath.mockImplementation(p => Promise.resolve(p))

    const content = await getPhaseContent('test-skill', 'phase-one')
    expect(content).toBe('# Phase One\n\nContent here.')
  })

  test('returns null for an unknown skill', async () => {
    fs.readFile.mockRejectedValue(new Error('ENOENT'))
    const content = await getPhaseContent('nonexistent', 'phase-one')
    expect(content).toBeNull()
  })

  test('returns null for an unknown phase id', async () => {
    fs.readFile.mockResolvedValueOnce(JSON.stringify(MOCK_MANIFEST))
    const content = await getPhaseContent('test-skill', 'nonexistent-phase')
    expect(content).toBeNull()
  })

  test('returns null if the reference file is missing', async () => {
    fs.readFile
      .mockResolvedValueOnce(JSON.stringify(MOCK_MANIFEST))
      .mockRejectedValueOnce(new Error('ENOENT'))
    // realpath resolves to same path so we reach readFile
    fs.realpath.mockImplementation(p => Promise.resolve(p))
    const content = await getPhaseContent('test-skill', 'phase-one')
    expect(content).toBeNull()
  })
})

describe('getSkillManifest - path traversal prevention', () => {
  beforeEach(() => jest.clearAllMocks())

  test('returns null for path traversal in skillName', async () => {
    expect(await getSkillManifest('../../etc/passwd')).toBeNull()
  })
  test('returns null for skillName with slash', async () => {
    expect(await getSkillManifest('foo/bar')).toBeNull()
  })
  test('returns null for skillName with null byte', async () => {
    expect(await getSkillManifest('foo\x00bar')).toBeNull()
  })
  test('returns null for empty skillName', async () => {
    expect(await getSkillManifest('')).toBeNull()
  })
  test('returns null for non-string skillName', async () => {
    expect(await getSkillManifest(['../../etc'])).toBeNull()
  })
})

describe('getPhaseContent - path traversal prevention', () => {
  beforeEach(() => jest.clearAllMocks())

  test('returns null for non-string phaseId', async () => {
    // getSkillManifest mock returns null for invalid skillName,
    // so just verify non-string phaseId is handled
    const result = await getPhaseContent('deception-engineering', null)
    expect(result).toBeNull()
  })
})
