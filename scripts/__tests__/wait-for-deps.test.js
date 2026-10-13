'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawnSync } = require('child_process')
const { internalSpecs } = require('../wait-for-deps')

const SCRIPT = path.join(__dirname, '..', 'wait-for-deps.js')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-wait-'))
test.after(() => fs.rmSync(tmp, { recursive: true, force: true }))

// A fake `npm view`: prints a version when the spec is in $FAKE_PUBLISHED (comma separated), else exits 1.
const fake = path.join(tmp, 'fake-view.js')
fs.writeFileSync(fake, "const s=process.argv[2];if((process.env.FAKE_PUBLISHED||'').split(',').includes(s)){console.log('\"0.1.0\"')}else{process.exit(1)}\n")
const pkg = (deps, field = 'dependencies') => { const f = path.join(tmp, `p-${Math.random().toString(36).slice(2)}.json`); fs.writeFileSync(f, JSON.stringify({ name: 'x', [field]: deps })); return f }
const run = (file, published, extra = []) => spawnSync(process.execPath, [SCRIPT, file, ...extra], {
  encoding: 'utf8', env: { ...process.env, WAIT_FOR_DEPS_VIEW: `"${process.execPath}" "${fake}"`, FAKE_PUBLISHED: published }
})

test('only internal ^ranges are considered', () => {
  assert.deepEqual(internalSpecs({ dependencies: { '@aegis-skills/themis-core': '^0.1.0', zod: '^3.0.0' }, peerDependencies: { 'aegis-skills': '^1.1.0' } }),
    ['@aegis-skills/themis-core@^0.1.0', 'aegis-skills@^1.1.0'])
  assert.deepEqual(internalSpecs({ dependencies: { zod: '^3.0.0' } }), [])
})

test('refuses specs that are not ^X.Y.Z (they would reach a shell)', () => {
  assert.throws(() => internalSpecs({ dependencies: { '@aegis-skills/themis-core': '*' } }), /unexpected spec/)
  assert.throws(() => internalSpecs({ dependencies: { '@aegis-skills/themis-core': '^0.1.0"; echo hi' } }), /unexpected spec/)
})

test('succeeds at once when the dependency is on the registry', () => {
  const r = run(pkg({ '@aegis-skills/themis-core': '^0.1.0' }), '@aegis-skills/themis-core@^0.1.0')
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /wait-for-deps: OK/)
})

test('no internal dependencies is a pass (themis-core, aegis)', () => {
  const r = run(pkg({ zod: '^3.0.0' }), '')
  assert.equal(r.status, 0)
  assert.match(r.stdout, /no internal dependencies/)
})

test('fails with the missing spec after the timeout', () => {
  const r = run(pkg({ '@aegis-skills/themis-core': '^0.1.0' }), '', ['--timeout-min', '0.0001', '--interval-sec', '1'])
  assert.equal(r.status, 1)
  assert.match(r.stderr, /unresolved after .* @aegis-skills\/themis-core@\^0\.1\.0.*Publish those packages first/)
})

test('the real themis-gateway needs exactly themis-core', () => {
  const pj = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'packages', 'themis-gateway', 'package.json'), 'utf8'))
  assert.deepEqual(internalSpecs(pj), [`@aegis-skills/themis-core@${pj.dependencies['@aegis-skills/themis-core']}`])
})
