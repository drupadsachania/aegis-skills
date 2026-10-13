'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const lib = require('../lib/release-manifests')

test('satisfiesCaret follows npm caret rules', () => {
  assert.equal(lib.satisfiesCaret('1.1.0', '1.1.0'), true)
  assert.equal(lib.satisfiesCaret('1.1.0', '1.9.3'), true)
  assert.equal(lib.satisfiesCaret('1.1.0', '2.0.0'), false)
  assert.equal(lib.satisfiesCaret('1.1.0', '1.0.9'), false)
  assert.equal(lib.satisfiesCaret('0.1.0', '0.1.7'), true)
  assert.equal(lib.satisfiesCaret('0.1.0', '0.2.0'), false)
  assert.equal(lib.satisfiesCaret('0.0.3', '0.0.4'), false)
})

test('nextVersion bumps and rejects bad input', () => {
  assert.equal(lib.nextVersion('1.1.0', 'patch'), '1.1.1')
  assert.equal(lib.nextVersion('1.1.3', 'minor'), '1.2.0')
  assert.equal(lib.nextVersion('1.1.3', 'major'), '2.0.0')
  assert.equal(lib.nextVersion('0.1.0', '0.3.0'), '0.3.0')
  assert.throws(() => lib.nextVersion('1.1.0', '1.1.0'), /not greater/)
  assert.throws(() => lib.nextVersion('1.1.0', '1.2.0-rc.1'), /prereleases/)
})

test('pins must be exact and current; rewrite touches only the bumped package', () => {
  const versions = { 'aegis-skills': '1.1.0', '@aegis-skills/themis-plugin': '0.1.0' }
  const text = '{"a":["-y","aegis-skills@^1","mcp"],"b":"aegis-skills@1.1.0","c":["-y","@aegis-skills/themis-plugin@0.1.0"],"d":"aegis-skills@1.0.9"}'
  const pins = lib.findPins(text)
  assert.deepEqual(pins.map(m => m[1]), ['aegis-skills', 'aegis-skills', '@aegis-skills/themis-plugin', 'aegis-skills'])
  const problems = pins.map(m => lib.pinProblem(m, versions))
  assert.match(problems[0], /must be an exact pin: aegis-skills@1\.1\.0/)
  assert.equal(problems[1], null)
  assert.equal(problems[2], null)
  assert.match(problems[3], /must equal aegis-skills@1\.1\.0/)
  assert.match(lib.pinProblem(lib.findPins('@aegis-skills/other@1.0.0')[0], versions), /not a package in this repo/)
  assert.equal(lib.pinProblem(lib.findPins('@aegis-skills/other@1.0.0')[0], versions, { lenient: true }), null)
  const out = lib.rewritePins(text, 'aegis-skills', '1.1.1')
  assert.equal((out.match(/aegis-skills@1\.1\.1/g) || []).length, 3)
  assert.match(out, /"@aegis-skills\/themis-plugin@0\.1\.0"/)
  assert.equal(lib.rewritePins(text, '@aegis-skills/themis-plugin', '0.1.1').includes('@aegis-skills/themis-plugin@0.1.1'), true)
})

test('setStrings edits one string value and keeps the rest of the file byte-for-byte', () => {
  const text = '{\r\n  "name": "x",\r\n  "version": "1.1.0",\r\n  "files": ["a", "b"],\r\n  "packages": [ { "version": "1.1.0" }, { "version": "9.9.9" } ]\r\n}\r\n'
  const out = lib.setStrings(text, [{ path: ['version'], value: '1.1.1' }, { path: ['packages', 0, 'version'], value: '1.1.1' }])
  assert.equal(out, text.replace('"version": "1.1.0",', '"version": "1.1.1",').replace('{ "version": "1.1.0" }', '{ "version": "1.1.1" }'))
  assert.throws(() => lib.setStrings(text, [{ path: ['files'], value: 'x' }]), /no string value/)
})

test('ranges: caret for packages, exact for the website; bumps only rewrite what no longer matches', () => {
  assert.equal(lib.rangeProblem('^1.1.0', '1.4.2'), null)
  assert.match(lib.rangeProblem('^1.1.0', '2.0.0'), /does not accept/)
  assert.equal(lib.rangeProblem('1.1.0', '1.1.0'), null)
  assert.match(lib.rangeProblem('1.1.0', '1.1.1'), /must equal/)
  assert.match(lib.rangeProblem('*', '1.1.1'), /must have the form/)
  assert.equal(lib.rangeAfterBump('^1.1.0', '1.1.1'), null)
  assert.equal(lib.rangeAfterBump('^0.1.0', '0.2.0'), '^0.2.0')
  assert.equal(lib.rangeAfterBump('1.1.0', '1.1.1'), '1.1.1')
})

test('doc table rows are read and rewritten per package', () => {
  const t = '| Package | Version |\n|---|---|\n| `aegis-skills` | 1.1.0 (osk 1.1) |\n| `@aegis-skills/themis-core` | 0.1.0 |\n'
  assert.deepEqual(lib.tableRows(t), [{ name: 'aegis-skills', version: '1.1.0' }, { name: '@aegis-skills/themis-core', version: '0.1.0' }])
  assert.equal(lib.rewriteTable(t, 'aegis-skills', '1.1.1'), t.replace('1.1.0 (osk', '1.1.1 (osk'))
})

test('the releasable allow-list is the three Phase 7 packages and is reflected on the table', () => {
  assert.deepEqual(lib.RELEASABLE, ['aegis-skills', '@aegis-skills/themis-core', '@aegis-skills/themis-gateway'])
  assert.deepEqual(lib.PACKAGES.filter(p => p.releasable).map(p => p.name), lib.RELEASABLE)
  assert.equal(lib.isReleasable('@aegis-skills/themis-plugin'), false)
  assert.equal(lib.isReleasable('@aegis-skills/themis'), false)
})

test('every package that exists in the real repo is on the table, every table entry has a directory', () => {
  const fs = require('fs')
  for (const p of lib.PACKAGES) assert.equal(fs.existsSync(lib.abs(`${p.dir}/package.json`)), true, p.dir)
  const dirs = fs.readdirSync(lib.abs('packages')).map(d => `packages/${d}`)
  assert.deepEqual(dirs.sort(), lib.PACKAGES.map(p => p.dir).sort())
})
