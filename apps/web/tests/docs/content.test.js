'use strict'

const fs = require('fs')
const path = require('path')
const { SECTIONS, listDocs, loadDoc } = require('../../lib/docs')
const { renderMarkdown } = require('../../lib/markdown')
const { DOCS_DIR, REPO_ROOT } = require('../../lib/site-paths')
const { AEGIS_PLATFORM_IDS } = require('../../lib/install-commands')

const FORBIDDEN = ['ChatGPT Action', 'openai-action', '@aegis-skills/core', 'aegis compile', 'better-sqlite3', 'Supabase']
const REMOVED = ['/api/themis', '/api/audit', '/api/exposure', '/invoke']
const SITE_ROUTES = ['/skills', '/paths', '/mcp', '/themis', '/docs', '/security', '/license']

const allDocs = () => SECTIONS.flatMap(s => s.pages.map(p => loadDoc(DOCS_DIR, s.key, p)))

test('every page listed in SECTIONS exists and has an H1', () => {
  for (const s of SECTIONS) {
    for (const p of s.pages) {
      const doc = loadDoc(DOCS_DIR, s.key, p)
      expect(doc && `${s.key}/${p}`).toBe(`${s.key}/${p}`)
      expect(doc.markdown.startsWith('# ')).toBe(true)
    }
  }
})

test('every markdown file in docs/{aegis,themis} is listed in SECTIONS', () => {
  for (const s of SECTIONS) {
    const onDisk = fs.readdirSync(path.join(DOCS_DIR, s.key)).filter(f => f.endsWith('.md')).map(f => f.slice(0, -3)).sort()
    expect(onDisk).toEqual([...s.pages].sort())
  }
})

test('no doc mentions removed products', () => {
  for (const d of allDocs()) {
    for (const bad of FORBIDDEN) expect(`${d.docPath}: ${d.markdown.includes(bad)}`).toBe(`${d.docPath}: false`)
    for (const r of REMOVED) expect(`${d.docPath}: ${d.markdown.includes(r)}`).toBe(`${d.docPath}: false`)
  }
})

test('docs never show a health score or promise weekly updates', () => {
  for (const d of allDocs()) {
    expect(`${d.docPath}: ${/\bhealth(?!care)/i.test(d.markdown)}`).toBe(`${d.docPath}: false`)
    expect(`${d.docPath}: ${/\bweekly\b/i.test(d.markdown)}`).toBe(`${d.docPath}: false`)
  }
})

test('README does not advertise removed website endpoints, weekly updates or health scores', () => {
  const readme = fs.readFileSync(path.join(REPO_ROOT, 'README.md'), 'utf8')
  for (const bad of ['ChatGPT Action', 'openai-action', 'TECHNICAL.md', ...REMOVED]) expect(readme.includes(bad)).toBe(false)
  expect(/\bweekly\b/i.test(readme)).toBe(false)
  expect(/\bhealth(?!care)/i.test(readme)).toBe(false)
})

test('TECHNICAL.md is retired', () => {
  expect(fs.existsSync(path.join(DOCS_DIR, 'TECHNICAL.md'))).toBe(false)
})

test('every install --platform id in docs is real', () => {
  for (const d of allDocs()) {
    for (const m of d.markdown.matchAll(/install --platform ([a-z-]+)/g)) expect(AEGIS_PLATFORM_IDS).toContain(m[1])
  }
})

test('every internal /docs link resolves to a page', () => {
  const hrefs = new Set(listDocs(DOCS_DIR).flatMap(s => s.pages.map(p => p.href)).concat(['/docs']))
  for (const d of allDocs()) {
    const html = renderMarkdown(d.markdown, { docPath: d.docPath })
    for (const m of html.matchAll(/href="(\/docs[^"#]*)/g)) expect(`${d.docPath} → ${m[1]}: ${hrefs.has(m[1])}`).toBe(`${d.docPath} → ${m[1]}: true`)
  }
})

test('absolute site links in docs point at real site pages', () => {
  for (const d of allDocs()) {
    const html = renderMarkdown(d.markdown, { docPath: d.docPath })
    for (const m of html.matchAll(/href="(\/[^"#]*)/g)) {
      const href = m[1]
      const ok = SITE_ROUTES.some(r => href === r || href.startsWith(`${r}/`)) || href.startsWith('/downloads/')
      expect(`${d.docPath} → ${href}: ${ok}`).toBe(`${d.docPath} → ${href}: true`)
    }
  }
})

test('relative links to repository files resolve to files that exist', () => {
  for (const d of allDocs()) {
    for (const m of d.markdown.matchAll(/\]\((\.[^)#\s]+)(?:#[^)]*)?\)/g)) {
      const target = path.resolve(REPO_ROOT, path.dirname(d.docPath), m[1])
      expect(`${d.docPath} → ${m[1]}: ${fs.existsSync(target)}`).toBe(`${d.docPath} → ${m[1]}: true`)
    }
  }
})
