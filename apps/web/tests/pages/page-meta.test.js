'use strict'

// Every page sets a <title> and a <meta name="description">, and the 404 page is on-brand and useful.
const fs = require('fs')
const path = require('path')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { WEB_ROOT } = require('../../lib/site-paths')

jest.mock('next/head', () => {
  const R = require('react')
  return { __esModule: true, default: ({ children }) => R.createElement('head', null, children) }
})

const PAGES_DIR = path.join(WEB_ROOT, 'pages')
function pageFiles (dir = PAGES_DIR, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) { if (e.name !== 'api') pageFiles(p, out) } else if (/\.js$/.test(e.name) && !e.name.startsWith('_')) out.push(p)
  }
  return out
}

async function render (file) {
  const mod = require(file)
  let props = {}
  if (mod.getStaticProps) {
    let ctx = {}
    if (mod.getStaticPaths) ctx = { params: (await mod.getStaticPaths()).paths[0].params }
    props = (await mod.getStaticProps(ctx)).props
  }
  return renderToStaticMarkup(React.createElement(mod.default, props))
}

const files = pageFiles()
test('the page set is what we expect (a new page needs a test here)', () => {
  expect(files.map(f => path.relative(PAGES_DIR, f).split(path.sep).join('/')).sort()).toEqual([
    '404.js', 'docs/[...slug].js', 'docs/index.js', 'index.js', 'license.js', 'mcp.js', 'paths.js', 'quickstart.js',
    'security.js', 'skills/[name].js', 'skills/index.js', 'terms.js', 'themis.js', 'trust.js'
  ])
})

describe.each(files.map(f => [path.relative(PAGES_DIR, f).split(path.sep).join('/'), f]))('%s', (name, file) => {
  let html
  beforeAll(async () => { html = await render(file) })

  test('sets a title and a non-empty description of reasonable length', () => {
    expect(html).toMatch(/<title>[^<]+<\/title>/)
    const m = /<meta name="description" content="([^"]+)"/.exec(html)
    expect(m).not.toBeNull()
    expect(m[1].length).toBeGreaterThan(40)
    expect(m[1].length).toBeLessThanOrEqual(200)
  })
})

describe('404 page', () => {
  let html
  beforeAll(async () => { html = await render(path.join(PAGES_DIR, '404.js')) })
  test('is on brand and links home, skills and docs', () => {
    expect(html).toContain('Page <em>not found</em>')
    for (const href of ['/', '/skills', '/docs', '/quickstart']) expect(html).toContain(`href="${href}"`)
    expect(html).toContain('class="site-header"')
    expect(html).toContain('class="footer-root"')
  })
  test('has no canonical link and does not claim to be a real page', () => {
    expect(html).not.toContain('rel="canonical"')
  })
})
