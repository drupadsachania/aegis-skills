'use strict'

// The site contacts no third party: fonts are self-hosted (SIL OFL) and the CSP does not allow a font CDN.
const fs = require('fs')
const path = require('path')

const WEB = path.resolve(__dirname, '..', '..')
const read = p => fs.readFileSync(path.join(WEB, p), 'utf8')

describe('self-hosted fonts', () => {
  test('no source or config references a third-party font host', () => {
    for (const p of ['pages/_document.js', 'styles/globals.css', 'next.config.js', 'components/Layout.js']) {
      expect(`${p}: ${/fonts\.googleapis|fonts\.gstatic|use\.typekit|cdn\./i.test(read(p))}`).toBe(`${p}: false`)
    }
  })

  test('every @font-face url points at a file in public/fonts', () => {
    const css = read('styles/globals.css')
    const urls = [...css.matchAll(/url\('(\/fonts\/[^']+)'\)/g)].map(m => m[1])
    expect(urls.length).toBeGreaterThanOrEqual(8)
    for (const u of urls) expect(`${u}: ${fs.existsSync(path.join(WEB, 'public', u))}`).toBe(`${u}: true`)
  })

  test('each family has its licence text beside the files', () => {
    for (const f of ['LICENSE-newsreader.txt', 'LICENSE-ibm-plex-sans.txt', 'LICENSE-red-hat-mono.txt']) {
      expect(read(`public/fonts/${f}`)).toMatch(/SIL Open Font License/)
    }
  })

  test('the Content-Security-Policy allows no external font or style host', () => {
    const cfg = read('next.config.js')
    expect(cfg).toContain(`"font-src 'self'"`)
    expect(cfg).not.toMatch(/https:\/\/fonts/)
  })
})
