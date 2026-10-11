'use strict'

/**
 * Guards the site's use of the shared Kairos tokens:
 *  - the copy the site imports cannot drift from design/tokens.json
 *  - every --k-* variable used in site CSS exists
 *  - light is the default: no OS-driven dark mode anywhere in the site
 */
const fs = require('fs')
const path = require('path')
const { load, buildCss, leaves } = require('../../../../design/build-tokens')
const sync = require('../../scripts/sync-design-tokens')

const WEB = path.join(__dirname, '..', '..')
const read = p => fs.readFileSync(path.join(WEB, p), 'utf8').split('\r\n').join('\n')
const tokens = load()

describe('site design tokens', () => {
  it('the copy the site builds with equals what design/tokens.json generates', () => {
    const body = sync.expected().replace(/^\/\*[^\n]*\*\/\n/, '')
    expect(body).toBe(buildCss(tokens))
  })

  it('the generated site copy is in sync after predev/prebuild runs', () => {
    sync.sync()
    expect(sync.check()).toBe(true)
  })

  it('every var(--k-*) used by site CSS is defined by the tokens', () => {
    const defined = new Set((buildCss(tokens).match(/--k-[a-z0-9-]+(?=:)/g) || []))
    expect(defined.size).toBeGreaterThan(50)
    const used = new Set()
    for (const f of ['styles/globals.css']) for (const m of read(f).matchAll(/var\((--k-[a-z0-9-]+)/g)) used.add(m[1])
    const missing = [...used].filter(n => !defined.has(n))
    expect(missing).toEqual([])
  })

  it('has colour tokens for both themes with identical names', () => {
    expect(leaves(tokens.color.dark).length).toBe(leaves(tokens.color.light).length)
  })

  it('site CSS carries no hard-coded colours (other than the mask black)', () => {
    const css = read('styles/globals.css').replace(/\/\*[\s\S]*?\*\//g, '')
    const hex = (css.match(/#[0-9a-fA-F]{3,8}\b/g) || []).filter(h => h.toLowerCase() !== '#000')
    expect(hex).toEqual([])
    expect(css).not.toMatch(/\brgba?\(/)
  })
})

describe('light is the default (no auto-dark)', () => {
  it('globals.css has no prefers-color-scheme media query', () => {
    expect(read('styles/globals.css')).not.toMatch(/@media[^{]*prefers-color-scheme/)
  })

  it('the generated tokens have no prefers-color-scheme either, and dark is data-theme only', () => {
    const css = fs.readFileSync(sync.SOURCE, 'utf8')
    expect(css).not.toMatch(/prefers-color-scheme/)
    expect(css).toContain(':root[data-theme="dark"]')
  })

  it('Layout and _document never read the OS colour scheme', () => {
    for (const f of ['components/Layout.js', 'pages/_document.js']) {
      expect(read(f)).not.toMatch(/matchMedia\([^)]*prefers-color-scheme/)
    }
  })

  it('the first-paint script only reads storage and only applies dark', () => {
    const doc = read('pages/_document.js')
    expect(doc).toMatch(/getItem\('aegis-theme'\)==='dark'/)
    expect(doc).toMatch(/name: 'color-scheme', content: 'light'/)
  })
})
