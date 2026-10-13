'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawnSync } = require('child_process')
const { flattenSkill } = require('../build-flat-prompts')
const meta = require('aegis-skills/lib/skill-meta')

const PACK = path.join(__dirname, '..', '..', 'packages', 'aegis', 'skills')

test('inlines every phase and stamps the intel date', () => {
  const dir = path.join(PACK, 'compliance')
  const out = flattenSkill(dir)
  const sj = meta.readSkillJson(dir)
  expect(out).not.toMatch(/^---\nname:/)
  expect(out).toContain('## Scope and authorization')
  for (const p of sj.phases) {
    expect(out).toContain(`## Phase: ${p.id}`)
    const firstLine = fs.readFileSync(path.join(dir, p.file), 'utf8').trim().split('\n')[0]
    expect(out).toContain(firstLine)
  }
  expect(out).toMatch(new RegExp(`Intel as of ${sj['self-learning']['last-intel-sync']}`, 'i'))
})

test('says "not yet synced" when the skill has no intel date', () => {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-flat-')), 'demo')
  fs.mkdirSync(path.join(dir, 'references'), { recursive: true })
  fs.writeFileSync(path.join(dir, 'SKILL.md'), '---\nname: demo\n---\n\n# Demo\n')
  fs.writeFileSync(path.join(dir, 'references', 'one.md'), 'Phase one body')
  meta.writeSkillJson(dir, { osk: '1.1', name: 'demo', version: '1.1.0', phases: [{ id: 'one', file: 'references/one.md', tokens: 4 }] })
  const out = flattenSkill(dir)
  expect(out).toMatch(/intel as of not yet synced/i)
  expect(out).toContain('Phase one body')
})

test('the CLI writes one file per skill', () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-flat-out-'))
  const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'build-flat-prompts.js'), '--out', outDir], { encoding: 'utf8' })
  expect(r.status).toBe(0)
  expect(fs.readdirSync(outDir).filter(f => f.endsWith('.md'))).toHaveLength(24)
})
