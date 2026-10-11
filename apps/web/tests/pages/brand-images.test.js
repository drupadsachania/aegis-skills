/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * Brand integration guard: every <img> on the key pages is accessible (alt attribute present),
 * has explicit width/height (no layout shift), points at a file that ships in public/, and only
 * the hero logo is eager. Also checks the favicon / social-image wiring.
 */
const fs = require('fs')
const path = require('path')
const React = require('react')
const { render } = require('@testing-library/react')
require('@testing-library/jest-dom')
const { PATHS } = require('../../lib/install-commands')

const PUBLIC = path.join(__dirname, '..', '..', 'public')

const Home = require('../../pages/index').default
const Themis = require('../../pages/themis').default
const Skills = require('../../pages/skills/index').default
const Skill = require('../../pages/skills/[name]').default
const Docs = require('../../pages/docs/index').default
const Paths = require('../../pages/paths').default
const Layout = require('../../components/Layout')

const SKILL_PROPS = {
  manifest: { name: 'compliance', version: '1.1.0', description: 'Compliance workflow.', tags: [], frameworks: [], phases: [] },
  family: { key: 'governance', label: 'Governance & Risk' },
  scopeHtml: '<p>scope</p>',
  flatPrompt: 'x',
  intelAsOf: '2026-08-18',
  download: { prompt: '/p.md', zip: '/z.zip', promptBytes: 1000, zipBytes: 1000 },
  packTabs: [{ id: 'codex', label: 'Codex', steps: [{ label: 'shell', code: 'npx aegis-skills install' }] }]
}

const PAGES = {
  home: () => React.createElement(Home, { skillCount: 24, familyCount: 5, paths: PATHS }),
  themis: () => React.createElement(Themis, { paths: PATHS, shots: [{ file: 'a.png', alt: 'a', caption: 'c', exists: false }] }),
  skills: () => React.createElement(Skills, { skills: [], families: [], familyByName: {} }),
  skill: () => React.createElement(Skill, SKILL_PROPS),
  docs: () => React.createElement(Docs, { nav: [] }),
  paths: () => React.createElement(Paths, { paths: PATHS }),
  layout: () => React.createElement(Layout, null, React.createElement('p', null, 'x'))
}

describe.each(Object.entries(PAGES))('<img> on %s', (_name, make) => {
  it('every image has alt, explicit width/height and a shipped source', () => {
    render(make())
    const imgs = Array.from(document.querySelectorAll('img'))
    expect(imgs.length).toBeGreaterThan(0) // header + footer icons at minimum
    for (const img of imgs) {
      expect(img.hasAttribute('alt')).toBe(true)
      expect(Number(img.getAttribute('width'))).toBeGreaterThan(0)
      expect(Number(img.getAttribute('height'))).toBeGreaterThan(0)
      const src = img.getAttribute('src')
      expect(src.startsWith('/')).toBe(true)
      // screenshots are optional placeholders, everything else must exist in public/
      if (!src.startsWith('/img/themis/')) expect(fs.existsSync(path.join(PUBLIC, src))).toBe(true)
      // content images carry a real description; only the small decorative icons may use alt=""
      if (!/-icon\.svg$/.test(src)) expect(img.getAttribute('alt').length).toBeGreaterThan(3)
    }
  })
})

describe('loading strategy', () => {
  it('the Themis hero lockup is eager with high fetch priority; pack-card marks are lazy', () => {
    render(PAGES.themis())
    const lockup = document.querySelector('img.logo-lockup')
    expect(lockup).toHaveAttribute('loading', 'eager')
    expect(lockup).toHaveAttribute('fetchpriority', 'high')
  })

  it('home pack cards use the large marks, lazy, as webp', () => {
    render(PAGES.home())
    const marks = Array.from(document.querySelectorAll('img.logo-mark'))
    expect(marks.map(m => m.getAttribute('src'))).toEqual(['/brand/aegis-mark-320.webp', '/brand/themis-mark-320.webp'])
    for (const m of marks) expect(m).toHaveAttribute('loading', 'lazy')
  })
})

describe('shipped brand files', () => {
  it('large raster logos are webp and small enough for every visitor (<= 120 KB)', () => {
    const dir = path.join(PUBLIC, 'brand')
    const files = fs.readdirSync(dir)
    expect(files.filter(f => /\.png$/.test(f))).toEqual([]) // PNG masters live in design/brand/source
    for (const f of files.filter(f => /\.webp$/.test(f))) expect(fs.statSync(path.join(dir, f)).size).toBeLessThanOrEqual(120 * 1024)
    for (const f of files.filter(f => /\.svg$/.test(f))) expect(fs.statSync(path.join(dir, f)).size).toBeLessThan(8 * 1024)
  })

  it('favicon, touch icon and social image exist', () => {
    for (const f of ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'og.png']) expect(fs.existsSync(path.join(PUBLIC, f))).toBe(true)
  })
})

describe('document and head wiring', () => {
  const read = p => fs.readFileSync(path.join(__dirname, '..', '..', p), 'utf8')

  it('_document links the favicon set', () => {
    const doc = read('pages/_document.js')
    expect(doc).toContain("rel: 'icon', href: '/favicon.svg'")
    expect(doc).toContain("rel: 'apple-touch-icon', href: '/apple-touch-icon.png'")
  })

  it('Layout emits Open Graph and Twitter tags for the shared 1200x630 image', () => {
    const layout = read('components/Layout.js')
    for (const k of ["property: 'og:image'", "name: 'twitter:card'", "content: 'summary_large_image'", "content: '1200'", "content: '630'"]) expect(layout).toContain(k)
  })

  it('the CSP still only allows self and data: images', () => {
    expect(read('next.config.js')).toContain('"img-src \'self\' data:"')
  })
})

describe('footer', () => {
  it('credits Kairos Foundation with an external link, plus its GitHub organisation', () => {
    render(PAGES.layout())
    const foundation = Array.from(document.querySelectorAll('footer a')).filter(a => a.getAttribute('href') === 'https://kairos-foundation.org/')
    expect(foundation.length).toBeGreaterThan(0)
    for (const a of foundation) expect(a.getAttribute('rel')).toMatch(/noopener/)
    expect(document.querySelector('footer').textContent).toMatch(/A Kairos Foundation project/)
    expect(document.querySelector('footer a[href="https://github.com/kairos-dev-kairos-ecl"]')).not.toBeNull()
  })
})
