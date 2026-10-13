'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const { releaseReadiness, RULES } = require('../assert-pack')
const lib = require('../lib/release-manifests')

const README = 'Internal library of the Themis agent. Pre-1.0: the API may change. Themis itself is in development. '.repeat(6) + '\n## Licence\n(Apache-2.0 OR MIT)'
const pkg = lib.findPackage('themis-core')
const good = () => ({
  name: pkg.name, version: '0.1.0', description: 'A description that is long enough to count.', license: lib.LICENSE,
  homepage: 'https://example.com/x', bugs: { url: 'https://example.com/issues' }, keywords: ['a', 'b', 'c'], files: ['dist'],
  engines: { node: '>=24' }, publishConfig: { access: 'public', provenance: true }, repository: { directory: pkg.dir }
})

test('a complete scoped package manifest and README are publish-ready', () => {
  assert.deepEqual(releaseReadiness(pkg, good(), RULES[pkg.name], README), [])
})

test('every missing publish field is reported', () => {
  const pj = good()
  delete pj.homepage; delete pj.keywords; delete pj.files
  pj.publishConfig = { access: 'public' }
  pj.engines = { node: '>=22' }
  const out = releaseReadiness(pkg, pj, RULES[pkg.name], 'short')
  for (const re of [/homepage/, /keywords/, /"files"/, /provenance/, /engines\.node/, /fewer than 80 words/, /pre-1\.0/]) {
    assert.ok(out.some(m => re.test(m)), `expected a problem matching ${re}: ${out.join(' | ')}`)
  }
})

test('every package has pack rules and the releasable ones are marked on the table', () => {
  for (const p of lib.PACKAGES) assert.ok(RULES[p.name], p.name)
  assert.deepEqual(lib.PACKAGES.filter(p => p.releasable).map(p => p.name), lib.RELEASABLE)
})
