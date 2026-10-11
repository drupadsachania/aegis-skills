'use strict'

const fs = require('fs')
const path = require('path')
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

describe('brand colours (logo artwork)', () => {
  const brand = Object.fromEntries(leaves(tokens.brand))
  const plate = colour('light', 'plate')

  it('are exposed as --k-brand-* custom properties', () => {
    const css = buildCss(tokens)
    for (const [name, value] of Object.entries(brand)) expect(css).toContain(`--k-brand-${name}: ${value};`)
  })

  it('the logo plate is the same cream in light and dark', () => {
    expect(colour('dark', 'plate')).toBe(plate)
  })

  it.each(tokens.$extensions['kairos.brand'].map(r => [`${r.token} on plate: ${r.usage}, ${r.ratio}:1 (${r.rule} ${r.limit})`, r]))('%s', (_label, r) => {
    const ratio = contrast(brand[r.token], plate)
    // the recorded number is the documented measurement
    expect(Math.abs(ratio - r.ratio)).toBeLessThan(0.02)
    if (r.rule === 'max') expect(ratio).toBeLessThan(r.limit)
    else expect(ratio).toBeGreaterThanOrEqual(r.limit)
  })

  it('brand gold and blue never reach AA for text, so they are fills/art only', () => {
    for (const r of tokens.$extensions['kairos.brand'].filter(x => x.usage === 'fill-only' && x.token !== 'paper')) {
      expect(contrast(brand[r.token], plate)).toBeLessThan(4.5)
    }
  })

  it('no stylesheet uses a --k-brand-* colour as text colour or on borders/outlines', () => {
    const roots = [path.join(__dirname, '..', 'apps', 'web', 'styles', 'globals.css'), path.join(__dirname, '..', 'packages', 'themis-app', 'ui', 'src', 'styles.css')]
    for (const f of roots) {
      const css = fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
      const bad = css.split(/\r?\n/).filter(l => /var\(--k-brand-/.test(l) && /(^|[\s{;])(color|border[a-z-]*|outline[a-z-]*|stroke|-webkit-text-fill-color|text-decoration-color|caret-color)\s*:/.test(l))
      expect(bad).toEqual([])
    }
  })
})
