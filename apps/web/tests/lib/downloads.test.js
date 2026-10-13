'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { buildDownloads, collectSkillEntries, readIntelAsOf, stampIntel } = require('../../lib/downloads')
const { readZip } = require('../helpers/read-zip')

function makeSkill (root, name, { intel = '2026-09-30', skillMd = true } = {}) {
  const d = path.join(root, name)
  fs.mkdirSync(path.join(d, 'references'), { recursive: true })
  fs.mkdirSync(path.join(d, 'artifacts'))
  if (skillMd) fs.writeFileSync(path.join(d, 'SKILL.md'), `---\nname: ${name}\n---\n# ${name}\n`)
  fs.writeFileSync(path.join(d, 'skill.json'), JSON.stringify({ osk: '1.1', name, version: '1.1.0' }))
  fs.writeFileSync(path.join(d, 'references', 'scope.md'), '# Scope\n')
  fs.writeFileSync(path.join(d, 'references', 'notes.txt'), 'not markdown')
  fs.writeFileSync(path.join(d, 'artifacts', 'system-prompt.txt'), 'old')
  if (intel) fs.writeFileSync(path.join(d, 'intel-state.json'), JSON.stringify({ 'last-intel-sync': intel }))
  return d
}

let tmp
beforeEach(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-dl-')) })
afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }))

test('collectSkillEntries ships only SKILL.md, skill.json and references/*.md', () => {
  const dir = makeSkill(tmp, 'alpha')
  expect(collectSkillEntries(dir, 'alpha').map(e => e.name))
    .toEqual(['alpha/SKILL.md', 'alpha/skill.json', 'alpha/references/scope.md'])
})

test('readIntelAsOf reads last-intel-sync and rejects junk', () => {
  expect(readIntelAsOf(makeSkill(tmp, 'a'))).toBe('2026-09-30')
  expect(readIntelAsOf(makeSkill(tmp, 'b', { intel: null }))).toBeNull()
  expect(readIntelAsOf(makeSkill(tmp, 'c', { intel: 'yesterday' }))).toBeNull()
})

test('stampIntel prepends a stamp only when none is present', () => {
  expect(stampIntel('# X', '2026-09-30')).toBe('> Intel as of 2026-09-30\n\n# X')
  expect(stampIntel('# X', null)).toBe('> Intel as of unknown\n\n# X')
  expect(stampIntel('Intel as of 2026-01-01\n# X', '2026-09-30')).toBe('Intel as of 2026-01-01\n# X')
})

test('buildDownloads writes prompts, zips and index.json and clears stale output', async () => {
  const skills = path.join(tmp, 'skills')
  makeSkill(skills, 'alpha')
  makeSkill(skills, 'beta', { intel: null })
  makeSkill(skills, 'gamma', { skillMd: false })
  const out = path.join(tmp, 'out')
  fs.mkdirSync(out)
  fs.writeFileSync(path.join(out, 'stale.txt'), 'x')
  const seen = []
  const flatten = dir => { seen.push(path.basename(dir)); return `# flat ${path.basename(dir)}` }

  const index = await buildDownloads({ skillsDir: skills, outDir: out, flatten, aegisVersion: '9.9.9' })

  expect(seen).toEqual(['alpha', 'beta'])
  expect(fs.existsSync(path.join(out, 'stale.txt'))).toBe(false)
  expect(index.aegisVersion).toBe('9.9.9')
  expect(index.skills.map(s => s.name)).toEqual(['alpha', 'beta'])
  expect(index.skills[0]).toMatchObject({ version: '1.1.0', intelAsOf: '2026-09-30',
    prompt: '/downloads/prompts/alpha.md', zip: '/downloads/skills/alpha.zip' })
  expect(index.skills[0].zipSha256).toMatch(/^[0-9a-f]{64}$/)
  expect(fs.readFileSync(path.join(out, 'prompts', 'alpha.md'), 'utf8'))
    .toBe('> Intel as of 2026-09-30\n\n# flat alpha')
  const names = readZip(fs.readFileSync(path.join(out, 'skills', 'beta.zip'))).map(e => e.name)
  expect(names).toEqual(['beta/SKILL.md', 'beta/skill.json', 'beta/references/scope.md'])
  expect(JSON.parse(fs.readFileSync(path.join(out, 'index.json'), 'utf8'))).toEqual(index)
})
