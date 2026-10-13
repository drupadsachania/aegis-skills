'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { SITE_URL } = require('../../lib/site-url')
const { SKILLS_DIR, DOCS_DIR, WEB_ROOT } = require('../../lib/site-paths')
const { listDocs, loadDoc } = require('../../lib/docs')
const S = require('../../scripts/build-sitemap')

test('the route list holds the static pages, all 24 skill pages and every docs page', () => {
  const routes = S.collectRoutes()
  for (const r of ['/', '/quickstart', '/trust', '/terms', '/skills', '/paths', '/themis', '/mcp', '/docs', '/security', '/license']) expect(routes).toContain(r)
  expect(routes.filter(r => r.startsWith('/skills/'))).toHaveLength(24)
  const docs = listDocs(DOCS_DIR).flatMap(s => s.pages.map(p => p.href))
  expect(docs.length).toBeGreaterThan(15)
  for (const d of docs) expect(routes).toContain(d)
  expect(new Set(routes).size).toBe(routes.length)
  expect(routes.some(r => /404|api|legal/.test(r))).toBe(false)
})

test('every route maps to a real page or source file', () => {
  const pagesDir = path.join(WEB_ROOT, 'pages')
  for (const r of S.collectRoutes()) {
    if (r.startsWith('/skills/')) expect(fs.existsSync(path.join(SKILLS_DIR, r.split('/')[2], 'SKILL.md'))).toBe(true)
    else if (r.startsWith('/docs/')) { const [, , sec, slug] = r.split('/'); expect(loadDoc(DOCS_DIR, sec, slug || 'index')).not.toBeNull() }
    else {
      const rel = r === '/' ? 'index' : r.slice(1)
      expect(fs.existsSync(path.join(pagesDir, `${rel}.js`)) || fs.existsSync(path.join(pagesDir, rel, 'index.js'))).toBe(true)
    }
  }
})

test('the XML is well formed, absolute, escaped and uses the production origin', () => {
  const xml = S.buildSitemap(['/', '/a&b', '/skills/x'], 'https://example.test')
  expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')).toBe(true)
  expect(xml).toContain('<loc>https://example.test/</loc>')
  expect(xml).toContain('<loc>https://example.test/a&amp;b</loc>')
  expect(xml.trim().endsWith('</urlset>')).toBe(true)
  expect(S.buildSitemap(['/trust'])).toContain(`<loc>${SITE_URL}/trust</loc>`)
})

test('write() creates the file, and the output is git-ignored like downloads', () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sitemap-')), 'nested', 'sitemap.xml')
  const { count } = S.write(out)
  expect(count).toBe(S.collectRoutes().length)
  expect((fs.readFileSync(out, 'utf8').match(/<url>/g) || []).length).toBe(count)
  const ignore = fs.readFileSync(path.join(WEB_ROOT, '..', '..', '.gitignore'), 'utf8')
  expect(ignore).toContain('apps/web/public/sitemap.xml')
})

test('robots.txt allows everything and names the sitemap on the production origin', () => {
  const robots = fs.readFileSync(path.join(WEB_ROOT, 'public', 'robots.txt'), 'utf8')
  expect(robots).toMatch(/^User-agent: \*$/m)
  expect(robots).toMatch(/^Allow: \/$/m)
  expect(robots).not.toMatch(/Disallow:\s*\S/)
  expect(robots).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`)
})

test('the sitemap is generated in predev and prebuild', () => {
  const scripts = JSON.parse(fs.readFileSync(path.join(WEB_ROOT, 'package.json'), 'utf8')).scripts
  expect(scripts.predev).toContain('scripts/build-sitemap.js')
  expect(scripts.prebuild).toContain('scripts/build-sitemap.js')
})

test('there is one production origin: Layout and the install commands both use lib/site-url.js', () => {
  expect(fs.readFileSync(path.join(WEB_ROOT, 'components', 'Layout.js'), 'utf8')).toContain("require('../lib/site-url')")
  expect(require('../../lib/install-commands').SITE_URL).toBe(SITE_URL)
})
