'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { SECTIONS, listDocs, loadDoc } = require('../../lib/docs')

let dir
beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-'))
  fs.mkdirSync(path.join(dir, 'aegis'))
  fs.writeFileSync(path.join(dir, 'aegis', 'index.md'), '# Aegis\n\nHi')
  fs.writeFileSync(path.join(dir, 'aegis', 'install.md'), '# Install Aegis\n')
  fs.writeFileSync(path.join(dir, 'aegis', 'zz-extra.md'), '# Extra\n')
  fs.writeFileSync(path.join(dir, 'aegis', 'Bad Name.md'), '# no\n')
})
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }))

test('sections are aegis, themis in that order', () => {
  expect(SECTIONS.map(s => s.key)).toEqual(['aegis', 'themis'])
})

test('listDocs orders known pages first, appends unknown ones, skips unsafe names', () => {
  const aegis = listDocs(dir).find(s => s.key === 'aegis')
  expect(aegis.pages.map(p => p.slug)).toEqual(['index', 'install', 'zz-extra'])
  expect(aegis.pages[0]).toEqual({ slug: 'index', title: 'Aegis', href: '/docs/aegis' })
  expect(aegis.pages[1].href).toBe('/docs/aegis/install')
  expect(listDocs(dir).find(s => s.key === 'themis').pages).toEqual([])
})

test('loadDoc returns content and refuses unknown sections or unsafe slugs', () => {
  expect(loadDoc(dir, 'aegis', 'install')).toMatchObject({ title: 'Install Aegis', docPath: 'docs/aegis/install.md' })
  expect(loadDoc(dir, 'aegis')).toMatchObject({ slug: 'index', title: 'Aegis' })
  expect(loadDoc(dir, 'secrets', 'index')).toBeNull()
  expect(loadDoc(dir, 'aegis', '../x')).toBeNull()
  expect(loadDoc(dir, 'aegis', 'missing')).toBeNull()
})
