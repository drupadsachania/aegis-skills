'use strict'

const fs = require('fs')
const { load, buildCss, contrast, leaves, OUT } = require('./build-tokens')

const tokens = load()
const pairs = tokens.$extensions['kairos.contrast']
const colour = (mode, name) => {
  const t = tokens.color[mode][name]
  if (!t) throw new Error(`unknown colour token ${mode}.${name}`)
  return t.$value
}

describe('Kairos colour tokens', () => {
  it('light and dark define exactly the same semantic names', () => {
    expect(leaves(tokens.color.dark).map(([k]) => k).sort()).toEqual(leaves(tokens.color.light).map(([k]) => k).sort())
  })

  for (const mode of ['light', 'dark']) {
    describe(`${mode} contrast`, () => {
      it.each(pairs.map(p => [`${p.fg} on ${p.bg} >= ${p.min}`, p]))('%s', (_label, p) => {
        const ratio = contrast(colour(mode, p.fg), colour(mode, p.bg))
        expect(ratio).toBeGreaterThanOrEqual(p.min)
      })
    })
  }

  it('gold is a fill, never text, on cream (light)', () => {
    for (const p of tokens.$extensions['kairos.contrast.lightOnly']) {
      expect(contrast(colour('light', p.fg), colour('light', p.bg))).toBeLessThan(p.max)
    }
  })
})

describe('tokens.css', () => {
  const css = fs.readFileSync(OUT, 'utf8').split('\r\n').join('\n') // tolerate autocrlf checkouts

  it('is up to date with tokens.json', () => {
    expect(css).toBe(buildCss(tokens))
  })

  it('is light by default and dark only via data-theme (no prefers-color-scheme)', () => {
    expect(css).toContain(':root[data-theme="dark"]')
    expect(css).not.toMatch(/prefers-color-scheme/)
    // dark colours must not leak into the default :root block
    const root = css.slice(0, css.indexOf(':root[data-theme="dark"]'))
    expect(root).toContain('--k-color-bg: #FEF9ED;')
    expect(root).not.toContain('#020E1C')
  })

  it('collapses motion durations for reduced-motion users', () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*--k-dur-base: 0\.01ms/)
  })
})
