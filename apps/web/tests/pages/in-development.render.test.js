'use strict'

// Themis is deferred on npm and the AI directories (owner decision 2026-10-12). Every place that shows
// Themis installs or availability must carry the "In development" marker, and Aegis must not.
const fs = require('fs')
const path = require('path')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { listDocs } = require('../../lib/docs')
const { DOCS_DIR, REPO_ROOT } = require('../../lib/site-paths')

const PAGES = { '/': '../../pages/index', '/paths': '../../pages/paths', '/themis': '../../pages/themis', '/quickstart': '../../pages/quickstart' }
const html = {}
beforeAll(async () => {
  for (const [route, mod] of Object.entries(PAGES)) {
    const page = require(mod)
    html[route] = renderToStaticMarkup(React.createElement(page.default, (await page.getStaticProps()).props))
  }
})
const count = (h, re) => (h.match(re) || []).length
const text = h => h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ')

test('home: the Themis pack card and both Themis path rows carry the pill; Aegis does not', () => {
  const h = html['/']
  expect(count(h, /data-status="in-development"/g)).toBe(3)
  const themisCard = h.slice(h.indexOf('twin-card themis'), h.indexOf('class="flow'))
  expect(themisCard).toContain('data-status="in-development"')
  const aegisCard = h.slice(h.indexOf('twin-card aegis'), h.indexOf('twin-card themis'))
  expect(aegisCard).not.toContain('status-pill')
  expect(text(h)).toContain('it is not on npm or in AI directories yet')
})

test('/paths: rows and sections for the two Themis paths carry the pill and the note, the other paths do not', () => {
  const h = html['/paths']
  expect(count(h, /data-status="in-development"/g)).toBe(6) // 2 matrix rows + 2 section headings + 2 install notes (first tab of each)
  for (const id of ['zero-install', 'hosted-mcp', 'skill-pack']) {
    const sec = h.slice(h.indexOf(`id="${id}"`), h.indexOf('</section>', h.indexOf(`id="${id}"`)))
    expect(sec).not.toContain('status-pill')
  }
  expect(text(h)).toContain('Themis is being matured locally and is not published yet. It will be announced here and is not available through AI directories yet. You can run it today from the repository — see the Themis docs')
  expect(text(h)).toContain('Available after the first release') // Aegis skill pack keeps its own note
})

test('/themis: hero pill, a "Where to get it" block (plans, no dates), and an install section that says what works today', () => {
  const h = html['/themis']
  const t = text(h)
  expect(h.indexOf('data-status="in-development"')).toBeLessThan(h.indexOf('id="modes"'))
  expect(h).toContain('id="where"')
  expect(t).toContain('Where to get it')
  expect(t).toContain('once its tool contract is stable and a supported remote endpoint exists')
  expect(t).toContain('These are plans, not promises, and they carry no dates.')
  expect(t).toMatch(/Aegis First release The first release: the npm package, with the plugin directories coming right after launch/)
  expect(t).toMatch(/Themis In development Local-first today/)
  expect(t).not.toMatch(/\bQ[1-4]\s?20\d\d\b/)
  expect(h).not.toMatch(/>\s*LIVE\s*</)
  // from-source steps shown on the page exist in the repo
  expect(t).toContain('npm run build -w @aegis-skills/themis')
  expect(fs.existsSync(path.join(REPO_ROOT, 'packages', 'themis-app', 'bin', 'themis.js'))).toBe(true)
  expect(fs.readFileSync(path.join(REPO_ROOT, 'packages', 'themis-plugin', 'package.json'), 'utf8')).toContain('"themis-mcp": "./dist/index.js"')
})

test('/quickstart marks Themis in development', () => {
  const t = text(html['/quickstart'])
  expect(html['/quickstart']).toContain('data-status="in-development"')
  expect(t).toContain('it is not published yet')
})

test('the docs hub blurb for Themis says in development; the mode docs describe from-source steps', () => {
  const themis = listDocs(DOCS_DIR).find(s => s.key === 'themis')
  expect(themis.blurb).toMatch(/in development/)
  const m1 = fs.readFileSync(path.join(DOCS_DIR, 'themis', 'mode-1-plugin.md'), 'utf8')
  const m2 = fs.readFileSync(path.join(DOCS_DIR, 'themis', 'mode-2-app.md'), 'utf8')
  expect(m1).toContain('## Run from the repository')
  expect(m1).toContain('packages/themis-plugin/dist/index.js')
  expect(m2).toContain('## Run from the repository')
  expect(m2).toContain('node packages/themis-app/bin/themis.js dashboard')
  for (const d of [m1, m2]) expect(d).toMatch(/Status: in development/)
})
