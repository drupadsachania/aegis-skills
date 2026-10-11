'use strict'

/**
 * The organisation is "Kairos Foundation" (https://kairos-foundation.org/). The old, misspelt name
 * must not creep back into tracked files. Historical plan text under docs/superpowers/plans/ is
 * exempt (it records what was said at the time). The forbidden strings are built from parts so
 * this file does not contain them.
 */
const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')

const ROOT = path.join(__dirname, '..', '..')
const EXEMPT = /^docs\/superpowers\/plans\//
const OLD_NAME = 'Kairo' + ' Foundation'
const OLD_DOMAIN = 'kairo-' + 'foundation.org'
const TEXT = /\.(md|json|js|ts|tsx|mts|css|html|txt|yml|yaml)$|(^|\/)(LICENSE(-[A-Z]+)?)$/

function tracked () {
  return execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\0').filter(Boolean)
}
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8')

describe('organisation naming', () => {
  const files = tracked().filter(f => TEXT.test(f) && !EXEMPT.test(f) && fs.existsSync(path.join(ROOT, f)))

  it('no tracked file outside the historical plans uses the old spelling of the name', () => {
    expect(files.filter(f => read(f).includes(OLD_NAME))).toEqual([])
  })

  it('no tracked file links the old misspelt domain', () => {
    expect(files.filter(f => read(f).includes(OLD_DOMAIN))).toEqual([])
  })

  it('the findings file records the resolved spelling and keeps the copyright-holder question open', () => {
    const text = read('docs/superpowers/plans/restructure/01-cross-phase-findings.md')
    expect(text).toContain('Organisation spelling resolved by the owner')
    expect(text).toMatch(/copyright holder/i)
    expect(text).toMatch(/USER decision \(0\.6 open\)/)
  })

  it('licences, authors and the footer use the corrected name', () => {
    for (const f of ['LICENSE', 'LICENSE-MIT', 'packages/aegis/LICENSE', 'packages/themis-app/LICENSE']) {
      expect(read(f)).toMatch(/Copyright \(c\) 2024 Kairos Foundation/)
    }
    for (const f of ['apps/web/package.json', 'packages/aegis/package.json']) {
      expect(JSON.parse(read(f)).author).toBe('Kairos Foundation')
    }
    for (const f of ['packages/aegis/.claude-plugin/plugin.json', 'packages/themis-plugin/.claude-plugin/plugin.json']) {
      expect(JSON.parse(read(f)).author.name).toBe('Kairos Foundation')
    }
    expect(read('apps/web/components/Layout.js')).toContain("KAIROS_URL = 'https://kairos-foundation.org/'")
  })
})
