'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { checkPackage, PACKAGES } = require('../check-registry-meta')

const ROOT = path.join(__dirname, '..', '..')

function pkgDir (pkg, server) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-registry-'))
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg))
  fs.writeFileSync(path.join(dir, 'server.json'), JSON.stringify(server))
  return dir
}

const PKG = { name: 'demo', version: '1.2.3', mcpName: 'io.github.drupadsachania/demo' }
const SERVER = {
  name: 'io.github.drupadsachania/demo', description: 'Short.', version: '1.2.3',
  packages: [{ registryType: 'npm', identifier: 'demo', version: '1.2.3' }]
}

test('the real server.json files pass', () => {
  for (const rel of PACKAGES) expect({ rel, errors: checkPackage(path.join(ROOT, rel)) }).toEqual({ rel, errors: [] })
})

test('a consistent pair passes', () => {
  expect(checkPackage(pkgDir(PKG, SERVER))).toEqual([])
})

test('a description over 100 characters is reported', () => {
  expect(checkPackage(pkgDir(PKG, { ...SERVER, description: 'x'.repeat(101) })).join('\n')).toMatch(/101 characters/)
  expect(checkPackage(pkgDir(PKG, { ...SERVER, description: 'x'.repeat(100) }))).toEqual([])
})

test('a missing or mismatched mcpName is reported', () => {
  const { mcpName, ...noName } = PKG
  expect(checkPackage(pkgDir(noName, SERVER)).join('\n')).toMatch(/no mcpName/)
  expect(checkPackage(pkgDir({ ...PKG, mcpName: 'io.github.drupadsachania/other' }, SERVER)).join('\n')).toMatch(/must equal server.json name/)
})

test('a name outside the GitHub namespace is reported', () => {
  const bad = 'io.github.someone-else/demo'
  expect(checkPackage(pkgDir({ ...PKG, mcpName: bad }, { ...SERVER, name: bad })).join('\n')).toMatch(/must start with io.github.drupadsachania\//)
})

test('version and identifier drift is reported', () => {
  const errors = checkPackage(pkgDir(PKG, { ...SERVER, version: '1.2.4', packages: [{ registryType: 'npm', identifier: 'other', version: '9.9.9' }] })).join('\n')
  expect(errors).toMatch(/server.json version "1.2.4"/)
  expect(errors).toMatch(/identifier "other"/)
  expect(errors).toMatch(/package version "9.9.9"/)
})
