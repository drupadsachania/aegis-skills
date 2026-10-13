'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawnSync } = require('child_process')
const meta = require('aegis-skills/lib/skill-meta')
const { bumpMinor } = require('../migrate-skill-frontmatter')

const SCRIPT = path.join(__dirname, '..', 'migrate-skill-frontmatter.js')
const FIXTURE = path.join(__dirname, 'fixtures', 'legacy', 'test-skill')

function setup (scope = { 'test-skill': { purpose: 'Test defensively.', outOfScope: 'anything offensive.' } }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-migrate-'))
  const skills = path.join(root, 'skills')
  const dir = path.join(skills, 'test-skill')
  fs.cpSync(FIXTURE, dir, { recursive: true })
  fs.rmSync(path.join(dir, 'artifacts'), { recursive: true, force: true })
  const scopeFile = path.join(root, 'scope.json')
  fs.writeFileSync(scopeFile, JSON.stringify(scope))
  const run = (...args) => spawnSync(process.execPath, [SCRIPT, '--skills-dir', skills, '--scope-file', scopeFile, ...args], { encoding: 'utf8' })
  const snapshot = () => fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8') + fs.readFileSync(path.join(dir, 'skill.json'), 'utf8')
  return { dir, run, snapshot }
}

test('bumpMinor bumps the minor and resets the patch', () => {
  expect(bumpMinor('1.0.0')).toBe('1.1.0')
  expect(bumpMinor('2.0.3')).toBe('2.1.0')
  expect(() => bumpMinor('1.0')).toThrow(/x\.y\.z/)
})

test('--dry-run writes nothing', () => {
  const { run, snapshot } = setup()
  const before = snapshot()
  const r = run('--dry-run')
  expect(r.status).toBe(0)
  expect(r.stdout).toMatch(/Would migrate 1\/1 skills/)
  expect(snapshot()).toBe(before)
})

test('migrates frontmatter, skill.json and body', () => {
  const { dir, run } = setup()
  const r = run()
  expect(r.status).toBe(0)
  expect(r.stdout).toMatch(/Migrated 1\/1 skills/)

  const { data, body } = meta.parseSkillMd(fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8'))
  expect(Object.keys(data)).toEqual(['name', 'description', 'license', 'metadata'])
  expect(data.license).toBe('Apache-2.0 OR MIT')
  expect(data.metadata).toEqual({ version: '1.1.0', osk: '1.1', family: 'domain' })
  expect(data.description).toBe('A minimal test skill for compiler validation.')
  expect(body).toMatch(/## Scope and authorization\n\n- Purpose: Test defensively\.\n- Use only on systems you own or are explicitly authorized to assess\.\n- Out of scope: anything offensive\./)
  expect(body.indexOf('# Test Skill')).toBeLessThan(body.indexOf('## Scope and authorization'))
  expect(body).toContain('This is the main body of the test skill.')
  expect(body).toContain('- [Phase zero](references/phase-0.md)')

  const sj = meta.readSkillJson(dir)
  const phaseText = fs.readFileSync(path.join(dir, 'references', 'phase-0.md'), 'utf8')
  expect(sj).toMatchObject({
    osk: '1.1',
    name: 'test-skill',
    version: '1.1.0',
    family: 'domain',
    frameworks: ['mitre-attack'],
    tags: ['test'],
    research: { feeds: ['mitre-attack'], 'red-team': false }
  })
  expect(sj.phases).toEqual([{ id: 'phase-zero', file: 'references/phase-0.md', tokens: Math.ceil(phaseText.replace(/\r\n/g, '\n').length / 4) }])
  expect(sj.endpoints).toBeUndefined()
})

test('a second run is a no-op', () => {
  const { run, snapshot } = setup()
  run()
  const once = snapshot()
  const r = run()
  expect(r.status).toBe(0)
  expect(r.stdout).toMatch(/already osk 1\.1/)
  expect(snapshot()).toBe(once)
})

test('a missing scope entry aborts before writing anything', () => {
  const { run, snapshot } = setup({})
  const before = snapshot()
  const r = run()
  expect(r.status).toBe(1)
  expect(r.stderr).toMatch(/test-skill: no entry in scope file/)
  expect(snapshot()).toBe(before)
})
