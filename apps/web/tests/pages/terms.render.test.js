'use strict'

// /terms renders docs/legal/terms.md (single source). Checks that the page renders with its real static
// props, that no owner comment leaks, that internal links resolve and that the claims match the code.
const fs = require('fs')
const path = require('path')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { listDocs, SECTIONS } = require('../../lib/docs')
const { DOCS_DIR, REPO_ROOT, WEB_ROOT } = require('../../lib/site-paths')

const page = require('../../pages/terms')
let html
let source
beforeAll(async () => {
  const { props } = await page.getStaticProps()
  html = renderToStaticMarkup(React.createElement(page.default, props))
  source = fs.readFileSync(path.join(REPO_ROOT, 'docs', 'legal', 'terms.md'), 'utf8')
})

const text = h => h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ')

test('the page renders the terms with a version and an update date', () => {
  expect(html).toContain('Terms of <em>Service</em>')
  expect(text(html)).toMatch(/Version 1\.1 · Last updated 2026-10-13/)
  for (const h2 of ['What this service is', 'Open-source licences', 'Authorised, lawful, defensive use only', 'No warranty', 'Limitation of liability', 'Availability and fair use', 'Third-party services', 'Changes to these terms', 'Governing law', 'Contact']) {
    expect(text(html)).toContain(h2)
  }
})

test('the governing-law placeholder is a comment in the source and a visible sentence on the page, never a leaked comment', () => {
  expect(source).toContain('<!-- USER: governing law and jurisdiction -->')
  expect(text(html)).toContain("Governing law will be stated here once the Kairos Foundation's jurisdiction is confirmed.")
  expect(html).not.toMatch(/&lt;!--|<!--(?!-)|USER:/)
})

test('it states the facts the code backs: licence holder, rate limit, no model calls, no stored data', () => {
  const t = text(html)
  expect(t).toContain('Kairos Foundation')
  expect(t).toContain('Apache-2.0 OR MIT')
  expect(t).toMatch(/120 requests a minute/)
  expect(t).toMatch(/never send your data to an AI model/)
  const rate = fs.readFileSync(path.join(WEB_ROOT, 'lib', 'rate-limit.ts'), 'utf8')
  expect(rate).toMatch(/120/)
  expect(t).toContain('Adobe Fonts')
  expect(t).toContain('no cookies')
})

test('it invents no legal entity details', () => {
  const t = text(html)
  expect(t).not.toMatch(/registered (office|address|number)|company number|registration no|\bVAT\b|\bInc\.|\bLtd\b|\bGmbH\b/)
  const emails = (t.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/gi) || []).map(e => e.toLowerCase())
  expect(new Set(emails)).toEqual(new Set(['support@kairos-foundation.org', 'privacy@kairos-foundation.org']))
  expect(html).toContain('href="mailto:support@kairos-foundation.org"')
  expect(html).toContain('href="mailto:privacy@kairos-foundation.org"')
  expect(t).toMatch(/do not use email/)
})

test('every internal link resolves to a real page', () => {
  const docHrefs = new Set(listDocs(DOCS_DIR).flatMap(s => s.pages.map(p => p.href)).concat(['/docs']))
  const ROUTES = ['/trust', '/security', '/license', '/terms', '/skills', '/paths', '/themis', '/mcp', '/quickstart']
  const links = [...html.matchAll(/href="(\/[^"#]*)/g)].map(m => m[1])
  expect(links).toEqual(expect.arrayContaining(['/trust', '/security', '/license', '/docs/themis/privacy-policy']))
  for (const href of links) {
    if (href.startsWith('/_next') || /\.(svg|ico|png|css)$/.test(href)) continue
    const ok = ROUTES.includes(href) || docHrefs.has(href) || href === '/'
    expect(`${href}: ${ok}`).toBe(`${href}: true`)
  }
  for (const m of html.matchAll(/href="(https:\/\/[^"]+)"/g)) expect(m[1]).toMatch(/^https:\/\//)
})

test('the legal folder stays out of the docs hub', () => {
  expect(SECTIONS.map(s => s.key)).not.toContain('legal')
  expect(JSON.stringify(listDocs(DOCS_DIR))).not.toMatch(/terms-of-service|legal/i)
  expect(fs.existsSync(path.join(DOCS_DIR, 'legal', 'terms.md'))).toBe(true)
})

test('the footer, /security and /license link to the terms', async () => {
  expect(html).toContain('href="/terms"')
  for (const mod of ['security', 'license']) {
    const p = require(`../../pages/${mod}`)
    const props = (await p.getStaticProps()).props
    expect(renderToStaticMarkup(React.createElement(p.default, props))).toContain('href="/terms"')
  }
})
