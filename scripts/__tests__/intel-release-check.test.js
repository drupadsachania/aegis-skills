'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync, spawnSync } = require('child_process')

const SCRIPT = path.join(__dirname, '..', 'intel-release-check.js')
const S = 'packages/aegis/skills/demo'

function repo () {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-intel-'))
  const w = (rel, text) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), text) }
  const git = (...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.invalid', '-c', 'commit.gpgsign=false', '-c', 'tag.gpgsign=false', ...a], { cwd: root, encoding: 'utf8' })
  const commit = msg => { git('add', '-A'); git('commit', '-q', '-m', msg) }
  const run = (...flags) => spawnSync(process.execPath, [SCRIPT, ...flags], { env: { ...process.env, AEGIS_RELEASE_ROOT: root, GITHUB_OUTPUT: '', GITHUB_STEP_SUMMARY: '' }, encoding: 'utf8' })
  const decide = () => {
    const r = run()
    assert.equal(r.status, 0, r.stderr)
    return { release: /^release=(true|false)$/m.exec(r.stdout)[1], reason: /^reason=(.*)$/m.exec(r.stdout)[1] }
  }
  w('packages/aegis/package.json', JSON.stringify({ name: 'aegis-skills', version: '1.1.0' }))
  w(`${S}/SKILL.md`, '# demo\n')
  w(`${S}/references/live-threat-intel.md`, 'v1\n')
  w(`${S}/intel-state.json`, '{}\n')
  w('packages/aegis/health.json', '{}\n')
  git('init', '-q')
  return { root, w, git, commit, run, decide, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) }
}

test('no tag yet: the first release is manual', () => {
  const r = repo()
  try {
    r.commit('init')
    const d = r.decide()
    assert.equal(d.release, 'false')
    assert.match(d.reason, /no aegis-skills@\* tag yet/)
  } finally { r.cleanup() }
})

test('auto-release only for intel-only changes that ship', () => {
  const r = repo()
  try {
    r.commit('init'); r.git('tag', 'aegis-skills@1.1.0')
    assert.equal(r.decide().release, 'false', 'no changes')
    r.w(`${S}/intel-state.json`, '{"a":1}\n'); r.w('packages/aegis/health.json', '{"b":1}\n'); r.commit('state only')
    const state = r.decide()
    assert.equal(state.release, 'false', 'nothing shipped changed')
    assert.match(state.reason, /only intel state changed/)
    r.w(`${S}/references/live-threat-intel.md`, 'v2\n'); r.commit('chore: Aegis intel sync')
    assert.equal(r.decide().release, 'true', 'intel changed')
    assert.equal(r.run('--require-release').status, 0)
    r.w(`${S}/SKILL.md`, '# demo v2\n'); r.commit('human edit')
    const human = r.decide()
    assert.equal(human.release, 'false', 'human edit needs a chosen version')
    assert.match(human.reason, /non-intel changes .*SKILL\.md/)
    assert.equal(r.run('--require-release').status, 1, '--require-release fails closed')
  } finally { r.cleanup() }
})

test('package.json ahead of the newest tag means a manual release is in progress', () => {
  const r = repo()
  try {
    r.commit('init'); r.git('tag', 'aegis-skills@1.1.0')
    r.w(`${S}/references/live-threat-intel.md`, 'v2\n')
    r.w('packages/aegis/package.json', JSON.stringify({ name: 'aegis-skills', version: '1.2.0' })); r.commit('bump')
    const d = r.decide()
    assert.equal(d.release, 'false')
    assert.match(d.reason, /manual release is in progress/)
  } finally { r.cleanup() }
})

test('changes outside packages/aegis are ignored; the newest tag is the baseline', () => {
  const r = repo()
  try {
    r.commit('init'); r.git('tag', 'aegis-skills@1.1.0')
    r.w('apps/web/x.js', '1\n'); r.commit('web change')
    assert.equal(r.decide().release, 'false')
    // an older tag (and a non-version tag) must not become the baseline
    r.git('tag', 'aegis-skills@1.0.0'); r.git('tag', 'aegis-skills@next')
    r.w(`${S}/references/live-threat-intel.md`, 'v2\n'); r.commit('intel')
    const d = r.decide()
    assert.equal(d.release, 'true')
    assert.match(d.reason, /since aegis-skills@1\.1\.0$/)
  } finally { r.cleanup() }
})

test('the guard patterns accept exactly the intel-managed files', () => {
  const { INTEL_RE, SHIPPED_RE } = require('../intel-release-check')
  for (const ok of ['packages/aegis/health.json', 'packages/aegis/.intel-sync-state.json', 'packages/aegis/skills/a-b/intel-state.json', 'packages/aegis/skills/a-b/references/live-threat-intel.md']) assert.ok(INTEL_RE.test(ok), ok)
  for (const bad of ['packages/aegis/package.json', 'packages/aegis/skills/a-b/SKILL.md', 'packages/aegis/skills/a-b/references/other.md', 'packages/aegis/skills/A/intel-state.json', 'packages/aegis/skills/a-b/skill.json']) assert.ok(!INTEL_RE.test(bad), bad)
  assert.ok(SHIPPED_RE.test('packages/aegis/skills/a-b/references/live-threat-intel.md'))
  assert.ok(!SHIPPED_RE.test('packages/aegis/skills/a-b/intel-state.json'))
})
