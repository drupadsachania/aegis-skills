'use strict'

/**
 * The organisation is "Kairos Foundation" (https://kairos-foundation.org/). The old spelling
 * "Kairo Foundation" must not creep back into tracked files. Historical plan text under
 * docs/superpowers/plans/ is exempt (it records what was said at the time).
 */
const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')

const ROOT = path.join(__dirname, '..', '..')
const EXEMPT = /^docs\/superpowers\/plans\//
const TEXT = /\.(md|json|js|ts|tsx|mts|css|html|txt|yml|yaml)$|(^|\/)(LICENSE(-[A-Z]+)?)$/

function tracked () {
  return execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\0').filter(Boolean)
}

describe('organisation naming', () => {
  const files = tracked().filter(f => TEXT.test(f) && !EXEMPT.test(f) && fs.existsSync(path.join(ROOT, f)))

  it('no tracked file outside the historical plans says "Kairo Foundation"', () => {
    const hits = files.filter(f => /Kairo Foundation/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')))
    expect(hits).toEqual([])
  })

  it('no tracked file links the misspelt kairo-foundation.org domain', () => {
    const hits = files.filter(f => /kairo-foundation\.org/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')))
    expect(hits).toEqual([])
  })

  it('the findings file mentions the old spelling only as history, next to the resolution', () => {
    const text = fs.readFileSync(path.join(ROOT, 'docs/superpowers/plans/restructure/01-cross-phase-findings.md'), 'utf8')
    expect(text).toMatch(/Kairos Foundation\*\* \(not "Kairo Foundation"/)
    expect(text).toMatch(/copyright holder/i)
  })

  it('licences, authors and the footer use the corrected name', () => {
    for (const f of ['LICENSE', 'LICENSE-MIT', 'packages/aegis/LICENSE', 'packages/themis-app/LICENSE']) {
      expect(fs.readFileSync(path.join(ROOT, f), 'utf8')).toMatch(/Copyright \(c\) 2024 Kairos Foundation/)
    }
    for (const f of ['apps/web/package.json', 'packages/aegis/package.json']) {
      expect(JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')).author).toBe('Kairos Foundation')
    }
    for (const f of ['packages/aegis/.claude-plugin/plugin.json', 'packages/themis-plugin/.claude-plugin/plugin.json']) {
      expect(JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')).author.name).toBe('Kairos Foundation')
    }
  })
})
