'use strict'
// Jest-side guard for the release tooling (the fixture tests for bump-version run under `npm run test:scripts`).
// Proves that the real repository passes the marketplace allow-list guard and that the allow-list is what Phase 7 ships.
const lib = require('../lib/release-manifests')
const { collectProblems } = require('../check-versions')

test('the marketplace lists only plugins whose npm packages are releasable', () => {
  expect(lib.marketplaceProblems()).toEqual([])
  const m = lib.readJson('.claude-plugin/marketplace.json').data
  expect(m.plugins.map(p => p.name)).toEqual(['aegis-skills'])
})

test('the releasable allow-list is aegis-skills, themis-core and themis-gateway', () => {
  expect(lib.RELEASABLE).toEqual(['aegis-skills', '@aegis-skills/themis-core', '@aegis-skills/themis-gateway'])
})

test('every manifest, pin, range and lockfile entry agrees with package.json', () => {
  expect(collectProblems().problems).toEqual([])
})
