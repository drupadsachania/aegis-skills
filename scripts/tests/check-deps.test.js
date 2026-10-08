'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { checkPackage, RULES } = require('../check-deps')

const RULE = { allow: ['zod'], max: 1, scan: ['lib'] }

function pkgDir (deps, files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-deps-'))
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'demo', dependencies: deps }))
  for (const [f, c] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true })
    fs.writeFileSync(path.join(dir, f), c)
  }
  return dir
}

test('a clean package passes', () => {
  const dir = pkgDir({ zod: '^3' }, { 'lib/a.js': "const { z } = require('zod')\nconst fs = require('node:fs')\nconst p = require('path')\nconst x = require('./b')\nconst me = require('demo/lib/x')\n" })
  expect(checkPackage(dir, RULE)).toEqual([])
})

test('an undeclared require is reported', () => {
  const dir = pkgDir({ zod: '^3' }, { 'lib/a.js': "require('chalk')" })
  expect(checkPackage(dir, RULE).join('\n')).toMatch(/requires "chalk"/)
})

test('a non-allowlisted or extra dependency is reported', () => {
  const errors = checkPackage(pkgDir({ zod: '^3', 'left-pad': '1' }, {}), RULE).join('\n')
  expect(errors).toMatch(/"left-pad" is not allowlisted/)
  expect(errors).toMatch(/max 1/)
})

test('peer and optional dependencies are refused', () => {
  const dir = pkgDir({ zod: '^3' }, {})
  const p = path.join(dir, 'package.json')
  fs.writeFileSync(p, JSON.stringify({ name: 'demo', dependencies: { zod: '^3' }, peerDependencies: { react: '*' } }))
  expect(checkPackage(dir, RULE).join('\n')).toMatch(/peerDependencies/)
})

test('the real aegis package passes', () => {
  const dir = path.join(__dirname, '..', '..', 'packages', 'aegis')
  expect(checkPackage(dir, RULES['packages/aegis'])).toEqual([])
})
