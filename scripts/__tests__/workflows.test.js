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

// ---- Phase 7 part B: release.yml and intel-release.yml ----
const lib = require('../lib/release-manifests')
const jobBlock = (text, name) => {
  const start = text.search(new RegExp(`^  ${name}:\n`, 'm'))
  assert.notEqual(start, -1, `job ${name} not found`)
  const rest = text.slice(start + 1)
  const next = rest.search(/\n  [a-z][a-z-]*:\n/)
  return next === -1 ? rest : rest.slice(0, next)
}
const jobNames = text => [...text.slice(text.indexOf('\njobs:')).matchAll(/^  ([a-z][a-z-]*):\n/gm)].map(m => m[1])

test('release.yml and intel-release.yml exist', () => {
  assert.ok(files.includes('release.yml'))
  assert.ok(files.includes('intel-release.yml'))
})

test('release.yml triggers only on tag pushes of the three releasable packages (plus workflow_dispatch)', () => {
  const t = read('release.yml')
  const on = t.slice(t.indexOf('\non:\n'), t.indexOf('\npermissions:'))
  const tags = [...on.matchAll(/^\s+- '([^']+)'$/gm)].map(m => m[1])
  assert.deepEqual(tags, lib.RELEASABLE.map(n => `${n}@*`))
  assert.match(on, /^  push:\n    tags:\n/m)
  assert.equal(/branches|pull_request|schedule/.test(on), false, 'no branch, PR or schedule triggers')
  assert.match(on, /^  workflow_dispatch:\n    inputs:\n      tag:/m)
})

test('the resolve job allow-list equals RELEASABLE and checks annotated tags, main ancestry and check-versions --tag', () => {
  const resolve = jobBlock(read('release.yml'), 'resolve')
  const names = /case "\$\{RELEASE_TAG%@\*\}" in\n\s+([^)\n]+)\) ;;/.exec(resolve)
  assert.ok(names, 'case allow-list present')
  assert.deepEqual(names[1].split('|').sort(), [...lib.RELEASABLE].sort())
  assert.match(resolve, /git cat-file -t "refs\/tags\/\$RELEASE_TAG"/)
  assert.match(resolve, /git merge-base --is-ancestor HEAD FETCH_HEAD/)
  assert.match(resolve, /check-versions\.js --tag "\$RELEASE_TAG"/)
  assert.match(resolve, /is not releasable yet/)
})

test('release.yml job graph: resolve -> verify -> publish -> github-release and smoke', () => {
  const t = read('release.yml')
  assert.deepEqual(jobNames(t), ['resolve', 'verify', 'publish', 'github-release', 'smoke'])
  assert.match(jobBlock(t, 'verify'), /needs: resolve\n/)
  assert.match(jobBlock(t, 'publish'), /needs: \[resolve, verify\]\n/)
  assert.match(jobBlock(t, 'github-release'), /needs: \[resolve, verify, publish\]\n/)
  assert.match(jobBlock(t, 'smoke'), /needs: \[resolve, publish\]\n/)
})

test('only the publish job can mint an OIDC token and it holds nothing else beyond contents: read', () => {
  const t = read('release.yml')
  assert.equal((t.match(/id-token:/g) || []).length, 1)
  const publish = jobBlock(t, 'publish')
  assert.match(publish, /permissions:\n      contents: read\n      id-token: write\n/)
  assert.match(publish, /environment: npm-publish\n/)
  assert.match(t, /^permissions: \{\}$/m)
  for (const j of jobNames(t)) assert.match(jobBlock(t, j), /^    permissions:/m, `${j} declares its own permissions`)
})

test('the publish job runs no install scripts and publishes the verified tarball with provenance', () => {
  const publish = jobBlock(read('release.yml'), 'publish')
  for (const bad of [/npm ci/, /npm run/, /npm test/, /npx /, /npm install(?! -g npm@11\.\d+\.\d+)/, /node scripts\/(?!wait-for-deps)/, /pack-to|assert-pack|build-/]) {
    assert.equal(bad.test(publish), false, `publish job must not match ${bad}`)
  }
  assert.match(publish, /uses: actions\/download-artifact@[0-9a-f]{40} # v\d+\.\d+\.\d+\n\s+with:\n\s+name: npm-tarball/)
  assert.match(publish, /sparse-checkout: scripts\/wait-for-deps\.js/)
  assert.equal((publish.match(/npm publish \.\/\*\.tgz --provenance --access public --tag latest/g) || []).length, 2, 'OIDC and bootstrap steps')
  assert.match(publish, /wait-for-deps\.js "\$RUNNER_TEMP\/meta\/package\/package\.json"/)
  assert.match(publish, /npm install -g npm@11\.21\.0/, 'pinned fallback for npm older than 11.5.1')
  assert.match(publish, /HAS_BOOTSTRAP_TOKEN: \$\{\{ secrets\.NPM_BOOTSTRAP_TOKEN != '' \}\}/)
})

test('the bootstrap token is only ever visible to the publish job; verify has no secrets', () => {
  const t = read('release.yml')
  const secretUses = [...t.matchAll(/secrets\.([A-Z_]+)/g)].map(m => m[1])
  assert.ok(secretUses.length > 0 && secretUses.every(s => s === 'NPM_BOOTSTRAP_TOKEN'), `unexpected secrets: ${secretUses}`)
  const withoutPublish = t.replace(jobBlock(t, 'publish'), '')
  assert.equal(/secrets\./.test(withoutPublish), false)
  assert.equal(/id-token|contents: write/.test(jobBlock(t, 'verify')), false)
})

test('GitHub Release: verify-tag, Aegis only is Latest, only that job writes contents', () => {
  const t = read('release.yml')
  const gr = jobBlock(t, 'github-release')
  assert.match(gr, /permissions:\n      contents: write\n/)
  assert.match(gr, /--verify-tag/)
  assert.match(gr, /"--latest=\$LATEST"/)
  assert.match(gr, /LATEST: \$\{\{ needs\.resolve\.outputs\.latest \}\}/)
  assert.equal((t.match(/contents: write/g) || []).length, 1)
  const smoke = jobBlock(t, 'smoke')
  assert.match(smoke, /permissions: \{\}/)
  assert.match(smoke, /ubuntu-latest, windows-latest, macos-latest/)
})

test('tag input and tag name only reach shell steps through env vars', () => {
  const t = read('release.yml')
  for (const m of t.matchAll(/run: \|?\n?([\s\S]*?)(?=\n\s+- |\n  [a-z-]+:\n|$)/g)) {
    assert.equal(/\$\{\{\s*(inputs|github\.ref_name|github\.event)/.test(m[1]), false, 'no expression interpolation of the tag inside run: blocks')
  }
})

test('intel-release.yml ships disabled: workflow_dispatch only, monthly cron commented out, instructions in the header', () => {
  const t = read('intel-release.yml')
  const on = t.slice(t.indexOf('\non:\n'), t.indexOf('\npermissions:'))
  assert.match(on, /^  # schedule:\n  #   - cron: '0 6 2 \* \*'$/m)
  assert.equal(/^\s*(schedule|push|pull_request)\s*:/m.test(on), false)
  assert.equal(/^\s+- cron:/m.test(t), false, 'no active cron')
  assert.match(on, /^  workflow_dispatch:/m)
  assert.match(on, /dry_run:[\s\S]*default: true/)
  const header = t.slice(0, t.indexOf('\non:\n'))
  assert.match(header, /DISABLED BY DEFAULT/)
  assert.match(header, /To enable it/)
  assert.match(header, /RELEASE_PAT/)
  assert.match(jobBlock(t, 'release'), /if: inputs\.dry_run == false/)
  assert.match(t, /^permissions: \{\}$/m)
})

test('intel-release.yml: only the release job sees the PAT and no job can publish to npm', () => {
  const t = read('intel-release.yml')
  assert.equal(/id-token/.test(t), false)
  assert.equal(/npm publish/.test(t), false)
  assert.equal(/secrets\./.test(t.replace(jobBlock(t, 'release'), '')), false)
  assert.match(jobBlock(t, 'release'), /environment: release-bot/)
  assert.deepEqual(jobNames(t), ['decide', 'verify', 'release'])
})

test('the first release of every releasable package has release notes named the way release.yml looks them up', () => {
  // Fixed versions on purpose: later patch releases (validation patches, intel patches) use generated notes.
  const FIRST = { 'aegis-skills': '1.1.0', '@aegis-skills/themis-core': '0.1.0', '@aegis-skills/themis-gateway': '0.1.0' }
  assert.deepEqual(Object.keys(FIRST).sort(), [...lib.RELEASABLE].sort())
  for (const [name, version] of Object.entries(FIRST)) {
    const file = `.github/release-notes/${`${name}@${version}`.split('/').join('__')}.md`
    assert.ok(lib.exists(file), `${file} is missing`)
    const text = fs.readFileSync(lib.abs(file), 'utf8')
    assert.match(text, /first release/i, `${file} should say it is the first release`)
    assert.equal(/production[- ]ready|battle-tested/i.test(text), false, `${file}: no overclaiming`)
  }
  assert.ok(read('release.yml').includes('.github/release-notes/${RELEASE_TAG//\\//__}.md'))
})
