'use strict'

// The owner's personal address must never be written in the repo. Role addresses are the only contacts.
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', '..')
// Built from parts so this file does not contain the forbidden string itself.
const FORBIDDEN = 'drupad.sachania' + '@'

test('no tracked file outside docs/superpowers contains the personal address', () => {
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 }).toString('utf8').split('\0')
    .filter(f => f && !f.startsWith('docs/superpowers/') && fs.existsSync(path.join(ROOT, f)))
  const hits = []
  for (const f of files) {
    const buf = fs.readFileSync(path.join(ROOT, f))
    if (buf.includes(0)) continue
    if (buf.toString('utf8').toLowerCase().includes(FORBIDDEN)) hits.push(f)
  }
  expect(hits).toEqual([])
})

test('the role addresses are present in the terms, privacy policy and security policy', () => {
  const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8')
  expect(read('docs/legal/terms.md')).toContain('support@kairos-foundation.org')
  expect(read('docs/legal/terms.md')).toContain('privacy@kairos-foundation.org')
  expect(read('docs/themis/privacy-policy.md')).toContain('privacy@kairos-foundation.org')
  expect(read('SECURITY.md')).toContain('support@kairos-foundation.org')
  expect(read('SECURITY.md')).toMatch(/not a vulnerability reporting channel/)
})
