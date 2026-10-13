'use strict'
// Structural guards for .github/workflows (built-ins only; GitHub itself is the real validator).
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')

const DIR = path.join(__dirname, '..', '..', '.github', 'workflows')
const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter(f => /\.ya?ml$/.test(f)) : []
const read = f => fs.readFileSync(path.join(DIR, f), 'utf8')

test('there is at least ci.yml and skill-health.yml', () => {
  assert.ok(files.includes('ci.yml'))
  assert.ok(files.includes('skill-health.yml'))
})

test('no tabs, and every file declares top-level permissions', () => {
  for (const f of files) {
    const t = read(f)
    assert.equal(/\t/.test(t), false, `${f} contains a tab`)
    assert.match(t, /^permissions:/m, `${f} has no top-level permissions`)
  }
})

test('every action is pinned to a full 40-character commit SHA with a version comment', () => {
  for (const f of files) {
    for (const line of read(f).split('\n')) {
      const m = /^\s*(?:-\s*)?uses:\s*(\S+)(.*)$/.exec(line)
      if (!m || m[1].startsWith('./')) continue
      assert.match(m[1], /^[\w.-]+\/[\w./-]+@[0-9a-f]{40}$/, `${f}: unpinned action ${m[1]}`)
      assert.match(m[2], /#\s*v\d+\.\d+\.\d+/, `${f}: add the version as a comment after ${m[1]}`)
    }
  }
})

test('no pull_request_target or workflow_run trigger anywhere', () => {
  for (const f of files) assert.equal(/^\s*(pull_request_target|workflow_run)\s*:/m.test(read(f)), false, f)
})

test('the PR workflow uses no secrets and no write permissions', () => {
  const ci = read('ci.yml')
  assert.equal(/secrets\./.test(ci), false)
  assert.equal(/:\s*write\b/.test(ci), false)
  assert.match(ci, /^permissions:\n\s+contents: read$/m)
})

test('skill-health is monthly and internal, ci checkouts do not persist credentials', () => {
  assert.match(read('skill-health.yml'), /cron: '0 0 1 \* \*'/)
  const ci = read('ci.yml')
  const checkouts = ci.split('\n').filter(l => /uses: actions\/checkout@/.test(l)).length
  const noPersist = ci.split('\n').filter(l => /persist-credentials: false/.test(l)).length
  assert.equal(noPersist, checkouts)
})

test('Node 24 everywhere (engines >=24); no Node 22 left in workflows', () => {
  for (const f of files) assert.equal(/node-version:\s*'?2[0-3]\b/.test(read(f)), false, f)
})
