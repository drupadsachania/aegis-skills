'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const meta = require('../lib/skill-meta')

function tmpSkill () {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-meta-'))
  fs.mkdirSync(path.join(dir, 'references'))
  fs.writeFileSync(path.join(dir, 'references', 'a.md'), 'x'.repeat(10))
  meta.writeSkillJson(dir, { osk: '1.1', name: 't', phases: [{ id: 'a', file: 'references/a.md', tokens: 1 }] })
  return dir
}

describe('skill-meta', () => {
  test('constants', () => {
    expect(meta.OSK).toBe('1.1')
    expect(meta.LICENSE).toBe('Apache-2.0 OR MIT')
    expect(meta.PHASE_FILE.test('references/scope-definition.md')).toBe(true)
    expect(meta.PHASE_FILE.test('references/../x.md')).toBe(false)
    expect(meta.PHASE_FILE.test('/etc/passwd')).toBe(false)
  })

  test('estimateTokens is ceil(chars / 4)', () => {
    expect(meta.estimateTokens('abcde')).toBe(2)
    expect(meta.estimateTokens('')).toBe(0)
  })
  test('estimateTokens ignores CRLF vs LF line endings', () => {
    expect(meta.estimateTokens('ab\r\ncd\r\nef\r\ngh\r\n')).toBe(meta.estimateTokens('ab\ncd\nef\ngh\n'))
  })

  test('parseSkillMd returns data and body', () => {
    const r = meta.parseSkillMd('---\nname: t\n---\n\n# T\n')
    expect(r.data.name).toBe('t')
    expect(r.body).toContain('# T')
  })

  test('parseSkillMd refuses the javascript front-matter engine', () => {
    expect(() => meta.parseSkillMd('---js\n{}\n---\n')).toThrow(/disabled/)
  })

  test('normalizeDescription collapses whitespace', () => {
    expect(meta.normalizeDescription('  a\n  b  ')).toBe('a b')
  })

  test('syncTokens rewrites stale counts and is idempotent', () => {
    const dir = tmpSkill()
    expect(meta.syncTokens(dir)).toBe(true)
    expect(meta.readSkillJson(dir).phases[0].tokens).toBe(3)
    expect(meta.syncTokens(dir)).toBe(false)
  })

  test('phaseFileTokens rejects files outside references/', () => {
    expect(() => meta.phaseFileTokens(os.tmpdir(), { file: '../secret.md' })).toThrow(/bad phase file/)
  })

  test('appendPhaseLinks links only unlinked phases, once', () => {
    const phases = [
      { id: 'scope-definition', file: 'references/scope-definition.md' },
      { id: 'live-threat-intel', file: 'references/live-threat-intel.md', auto: true }
    ]
    const out = meta.appendPhaseLinks('# T\n\nSee [x](references/scope-definition.md).\n', phases)
    expect(out).toContain('\n## Phases\n')
    expect(out).toContain('- [Live threat intel](references/live-threat-intel.md) — auto-updated weekly')
    expect(out.match(/scope-definition\.md/g)).toHaveLength(1)
    expect(meta.appendPhaseLinks(out, phases)).toBe(out)
  })
})
