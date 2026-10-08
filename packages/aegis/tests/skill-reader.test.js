'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-reader-'))
process.env.AEGIS_SKILLS_DIR = ROOT
const reader = require('../mcp/skill-reader')

function addSkill (name, phases, files) {
  const dir = path.join(ROOT, name)
  fs.mkdirSync(path.join(dir, 'references'), { recursive: true })
  for (const [f, c] of Object.entries(files)) fs.writeFileSync(path.join(dir, f), c)
  fs.writeFileSync(path.join(dir, 'skill.json'), JSON.stringify({
    osk: '1.1',
    name,
    version: '1.1.0',
    description: 'A test skill.',
    frameworks: ['mitre-attack'],
    tags: ['t'],
    context: { environments: ['cloud'] },
    endpoints: { action: 'https://example.invalid' },
    phases
  }))
}

beforeAll(() => {
  addSkill('alpha', [
    { id: 'one', file: 'references/one.md', tokens: 2 },
    { id: 'live-threat-intel', file: 'references/live-threat-intel.md', tokens: 2, auto: true }
  ], { 'references/one.md': '# One', 'references/live-threat-intel.md': 'intel' })
  addSkill('evil', [
    { id: 'up', file: '../alpha/references/one.md', tokens: 1 },
    { id: 'abs', file: '/etc/passwd', tokens: 1 },
    { id: 'gone', file: 'references/gone.md', tokens: 1 }
  ], {})
  fs.writeFileSync(path.join(ROOT, 'README.md'), 'not a skill')
})

afterAll(() => { delete process.env.AEGIS_SKILLS_DIR })

describe('getSkillsDir', () => {
  test('honours AEGIS_SKILLS_DIR', () => {
    expect(reader.getSkillsDir()).toBe(path.resolve(ROOT))
  })
})

describe('pickSkillsDir', () => {
  // Regression: when Next.js bundles the reader, __dirname/../skills is Next's own
  // output folder (.next/server/pages/skills). It exists but holds no skills, and
  // must not be chosen over the real skills directory.
  test('skips an existing directory that contains no skills', () => {
    const decoy = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-decoy-'))
    fs.writeFileSync(path.join(decoy, '[name].js'), '// next output')
    const real = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-real-'))
    fs.mkdirSync(path.join(real, 'one'))
    fs.writeFileSync(path.join(real, 'one', 'skill.json'), '{}')
    expect(reader.pickSkillsDir([decoy, real])).toBe(real)
  })

  test('falls back to the first candidate when none has skills', () => {
    const a = path.join(os.tmpdir(), 'aegis-nope-a')
    expect(reader.pickSkillsDir([a, path.join(os.tmpdir(), 'aegis-nope-b')])).toBe(a)
  })
})

describe('listSkills', () => {
  test('summarises every skill folder and keeps context', async () => {
    const skills = await reader.listSkills()
    expect(skills.map(s => s.name)).toEqual(['alpha', 'evil'])
    const alpha = skills[0]
    expect(alpha).toMatchObject({ version: '1.1.0', phases: 2, authoredPhases: 1, live: true, healthScore: null })
    expect(alpha.context).toEqual({ environments: ['cloud'] })
  })
})

describe('getSkillManifest', () => {
  test('is path-free', async () => {
    const m = await reader.getSkillManifest('alpha')
    const text = JSON.stringify(m)
    expect(text).not.toContain('references/')
    expect(m.endpoints).toBeUndefined()
    for (const p of m.phases) expect(Object.prototype.hasOwnProperty.call(p, 'file')).toBe(false)
    expect(m.phases[1]).toEqual({ id: 'live-threat-intel', tokens: 2, auto: true })
  })

  test('returns null for unknown or unsafe names', async () => {
    for (const bad of ['nope', '../../etc/passwd', 'foo/bar', 'foo\x00bar', '', ['x'], null]) {
      expect(await reader.getSkillManifest(bad)).toBeNull()
    }
  })
})

describe('getPhaseRef', () => {
  test('returns the ref for in-process callers only', async () => {
    expect(await reader.getPhaseRef('alpha', 'one')).toBe('references/one.md')
    expect(await reader.getPhaseRef('alpha', 'nope')).toBeNull()
    expect(await reader.getPhaseRef('evil', 'up')).toBeNull()
  })
})

describe('getPhaseContent', () => {
  test('reads a phase', async () => {
    expect(await reader.getPhaseContent('alpha', 'one')).toBe('# One')
  })

  test('returns null for unknown, unsafe or missing phases', async () => {
    expect(await reader.getPhaseContent('alpha', 'nope')).toBeNull()
    expect(await reader.getPhaseContent('alpha', null)).toBeNull()
    expect(await reader.getPhaseContent('alpha', 'x'.repeat(81))).toBeNull()
    expect(await reader.getPhaseContent('evil', 'up')).toBeNull()
    expect(await reader.getPhaseContent('evil', 'abs')).toBeNull()
    expect(await reader.getPhaseContent('evil', 'gone')).toBeNull()
    expect(await reader.getPhaseContent('../alpha', 'one')).toBeNull()
  })

  test('blocks a symlink that escapes the skill folder', async () => {
    const outside = path.join(os.tmpdir(), `aegis-outside-${process.pid}.md`)
    fs.writeFileSync(outside, 'secret')
    addSkill('linky', [{ id: 'out', file: 'references/out.md', tokens: 1 }], {})
    try {
      fs.symlinkSync(outside, path.join(ROOT, 'linky', 'references', 'out.md'))
    } catch {
      return // symlinks need privileges on Windows; containment is still covered above
    }
    expect(await reader.getPhaseContent('linky', 'out')).toBeNull()
  })
})
