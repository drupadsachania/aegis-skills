'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { lintSkill, lintAll, checkScopeBlock, BUDGETS } = require('../lint-skills')
const { migrateSkill } = require('../migrate-skill-frontmatter')
const meta = require('aegis-skills/lib/skill-meta')

const SKILL_MD = `---
name: demo-skill
description: Demo skill. Use when testing the linter.
license: Apache-2.0 OR MIT
metadata:
  version: "1.1.0"
  osk: "1.1"
  family: "domain"
---

# Demo

## Scope and authorization

- Purpose: Test the linter.
- Use only on systems you own or are explicitly authorized to assess.
- Out of scope: nothing real.

## Phases

- [One](references/one.md)
`

function makeSkill (name = 'demo-skill') {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-lint-')), name)
  fs.mkdirSync(path.join(dir, 'references'), { recursive: true })
  fs.writeFileSync(path.join(dir, 'SKILL.md'), SKILL_MD)
  fs.writeFileSync(path.join(dir, 'references', 'one.md'), '# One\n')
  meta.writeSkillJson(dir, {
    osk: '1.1',
    name: 'demo-skill',
    version: '1.1.0',
    description: 'Demo skill. Use when testing the linter.',
    family: 'domain',
    frameworks: [],
    tags: [],
    phases: [{ id: 'one', file: 'references/one.md', tokens: 2 }]
  })
  return dir
}

function edit (dir, file, fn) {
  const p = path.join(dir, file)
  fs.writeFileSync(p, fn(fs.readFileSync(p, 'utf8')))
}

const errorsOf = dir => lintSkill(dir).join('\n')

test('a valid skill has no errors', () => {
  expect(lintSkill(makeSkill())).toEqual([])
})

test('name must equal the folder', () => {
  expect(errorsOf(makeSkill('other'))).toMatch(/must equal folder name "other"/)
})

test('forbidden frontmatter keys are rejected', () => {
  const dir = makeSkill()
  edit(dir, 'SKILL.md', s => s.replace('license:', 'platforms: x\nlicense:'))
  expect(errorsOf(dir)).toMatch(/forbidden frontmatter key "platforms"/)
})

test('description longer than 1024 chars is rejected', () => {
  const dir = makeSkill()
  edit(dir, 'SKILL.md', s => s.replace('Demo skill. Use when testing the linter.', 'x'.repeat(1025)))
  expect(errorsOf(dir)).toMatch(/max 1024/)
})

test('metadata values must be strings', () => {
  const dir = makeSkill()
  edit(dir, 'SKILL.md', s => s.replace('osk: "1.1"', 'osk: 1.1'))
  expect(errorsOf(dir)).toMatch(/metadata\.osk must be a string/)
})

test('linked files must exist', () => {
  const dir = makeSkill()
  edit(dir, 'SKILL.md', s => s + '\nSee [x](references/missing.md).\n')
  expect(errorsOf(dir)).toMatch(/references\/missing\.md does not exist/)
})

test('every phase must be linked from the body', () => {
  const dir = makeSkill()
  edit(dir, 'SKILL.md', s => s.replace('- [One](references/one.md)', ''))
  expect(errorsOf(dir)).toMatch(/must link/)
})

test('stale token counts are rejected', () => {
  const dir = makeSkill()
  edit(dir, 'skill.json', s => s.replace('"tokens": 2', '"tokens": 99'))
  expect(errorsOf(dir)).toMatch(/skills:tokens/)
})

test('phase token budget is enforced', () => {
  const dir = makeSkill()
  fs.writeFileSync(path.join(dir, 'references', 'one.md'), 'x'.repeat(BUDGETS.phaseTokens * 4 + 4))
  meta.syncTokens(dir)
  expect(errorsOf(dir)).toMatch(/max 4000/)
})

test('the scope section is required and complete', () => {
  const dir = makeSkill()
  edit(dir, 'SKILL.md', s => s.replace('- Use only on systems you own or are explicitly authorized to assess.\n', ''))
  expect(errorsOf(dir)).toMatch(/explicitly authorized/)
  edit(dir, 'SKILL.md', s => s.replace('## Scope and authorization', '## Scope'))
  expect(errorsOf(dir)).toMatch(/missing "## Scope and authorization"/)
})

test('generated artifacts and endpoints are rejected', () => {
  const dir = makeSkill()
  fs.mkdirSync(path.join(dir, 'artifacts'))
  edit(dir, 'skill.json', s => s.replace('"osk"', '"endpoints": {}, "osk"'))
  const errors = errorsOf(dir)
  expect(errors).toMatch(/unexpected entry "artifacts"/)
  expect(errors).toMatch(/must not contain "endpoints"/)
})

test('the migrated legacy fixture passes lint', () => {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-lint-legacy-')), 'test-skill')
  fs.cpSync(path.join(__dirname, 'fixtures', 'legacy', 'test-skill'), dir, { recursive: true })
  const r = migrateSkill(dir, { 'test-skill': { purpose: 'Test.', outOfScope: 'nothing.' } })
  fs.writeFileSync(path.join(dir, 'SKILL.md'), r.skillMd)
  meta.writeSkillJson(dir, r.skillJson)
  expect(lintSkill(dir)).toEqual([])
})

test('the real Aegis pack lints clean', () => {
  const results = lintAll(path.join(__dirname, '..', '..', 'packages', 'aegis', 'skills'))
  expect(Object.keys(results)).toHaveLength(24)
  for (const [name, errors] of Object.entries(results)) expect({ name, errors }).toEqual({ name, errors: [] })
})

describe('checkScopeBlock', () => {
  const GOOD = [
    '## Scope and authorization',
    '- Purpose: defensive mapping',
    '- Use only on systems you own or are explicitly authorized to assess.',
    '- Out of scope: unauthorized targets',
    ''
  ].join('\n')

  test('passes when all three scope lines are present', () => {
    expect(checkScopeBlock(GOOD)).toEqual([])
  })
  test('flags a missing authorization line', () => {
    const body = GOOD.replace(/- Use only[^\n]*\n/, '')
    expect(checkScopeBlock(body).join('\n')).toMatch(/explicitly authorized/)
  })
  test('flags a missing purpose and a missing out-of-scope line', () => {
    const problems = checkScopeBlock('## Scope and authorization\n- Use only on systems you own or are explicitly authorized to assess.\n').join('\n')
    expect(problems).toMatch(/Purpose/)
    expect(problems).toMatch(/Out of scope/)
  })
  test('flags a missing scope section entirely', () => {
    expect(checkScopeBlock('## Overview\n')).toEqual(['missing "## Scope and authorization" section'])
  })
  test('works with CRLF line endings', () => {
    expect(checkScopeBlock(GOOD.replace(/\n/g, '\r\n'))).toEqual([])
  })
})
