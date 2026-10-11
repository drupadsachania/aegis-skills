'use strict'

// Small-screen readability floors (outside design review, 2026-10): no text below 12px anywhere in the
// global stylesheet, prose-like text at 15px or more, and the tap-target block for phones and touch.
const fs = require('fs')
const path = require('path')

const WEB = path.resolve(__dirname, '..', '..')
const css = fs.readFileSync(path.join(WEB, 'styles', 'globals.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

// Selectors allowed to declare a font-size below 12px. Keep this empty: add an entry only with a written reason.
const ALLOW_BELOW_12 = []

// Parses `selector { ... }` pairs (flat; media queries are unwrapped, which is what we want for a floor check).
function rules (source) {
  const out = []
  const re = /([^{}]+)\{([^{}]*)\}/g
  let m
  while ((m = re.exec(source))) out.push({ selector: m[1].trim().replace(/\s+/g, ' ').replace(/^@media[^{]*$/, ''), body: m[2] })
  return out
}

function px (value) {
  const v = value.trim()
  let m = /^(-?[\d.]+)px$/.exec(v)
  if (m) return Number(m[1])
  m = /^(-?[\d.]+)rem$/.exec(v)
  if (m) return Number(m[1]) * 16
  m = /^clamp\(\s*(-?[\d.]+)(px|rem)/.exec(v)
  if (m) return Number(m[1]) * (m[2] === 'rem' ? 16 : 1)
  return null // em, %, var(): relative to a parent that is itself checked
}

const sizes = []
for (const r of rules(css)) {
  for (const d of r.body.matchAll(/(?:^|;)\s*font-size\s*:\s*([^;]+)/g)) {
    const size = px(d[1])
    if (size !== null) sizes.push({ selector: r.selector, size })
  }
}

describe('global stylesheet font sizes', () => {
  test('finds a meaningful number of declarations', () => {
    expect(sizes.length).toBeGreaterThan(80)
  })

  test('no font-size below 12px outside the allow-list', () => {
    const bad = sizes.filter(s => s.size < 12 && !ALLOW_BELOW_12.includes(s.selector))
    expect(bad.map(s => `${s.selector} -> ${s.size}px`)).toEqual([])
  })

  test('the allow-list stays empty unless a reason is written next to it', () => {
    expect(ALLOW_BELOW_12).toEqual([])
  })

  test('prose-like text is 15px or more', () => {
    const PROSE = ['.footer-blurb', '.path-note', '.step-cell p', '.doc-card p', '.platforms-table', '.install-note',
      '.page-head .status-note', '.callout', '.prose table', '.docs-nav', '.sr-desc', '.screenshot figcaption', '.principle p', '.pr-how', '.twin-card p', '.lede']
    for (const sel of PROSE) {
      const hits = sizes.filter(s => s.selector === sel)
      expect(`${sel}: ${hits.length > 0}`).toBe(`${sel}: true`)
      for (const h of hits) expect(`${sel} ${h.size}px >= 15: ${h.size >= 15}`).toBe(`${sel} ${h.size}px >= 15: true`)
    }
  })

  test('body copy keeps a line-height of 1.5 or more', () => {
    const body = rules(css).find(r => r.selector === 'body')
    const lh = Number(/line-height\s*:\s*([\d.]+)/.exec(body.body)[1])
    expect(lh).toBeGreaterThanOrEqual(1.5)
    for (const sel of ['.prose', '.twin-card p', '.pr-how']) {
      const r = rules(css).find(x => x.selector === sel)
      expect(Number(/line-height\s*:\s*([\d.]+)/.exec(r.body)[1])).toBeGreaterThanOrEqual(1.5)
    }
  })
})

describe('tap targets on phones and touch', () => {
  const block = css.slice(css.lastIndexOf('@media (max-width: 760px), (pointer: coarse)'))

  test('the touch block exists and sets 44px targets for nav, buttons and pills', () => {
    expect(block).toMatch(/\.icon-btn\s*\{\s*width:\s*44px;\s*height:\s*44px/)
    for (const sel of ['.install-tab-btn', '.copy-btn', '.pill-toggle', '.family-btn', '.twin-link', '.nav-brand', '.breadcrumb a', '.footer-col a']) {
      expect(`${sel}: ${block.includes(sel)}`).toBe(`${sel}: true`)
    }
    expect(block.match(/min-height:\s*44px/g).length).toBeGreaterThanOrEqual(5)
  })

  test('mono labels step up to 13px in the touch block', () => {
    expect(block).toMatch(/\.pr-for[^{]*\{\s*font-size:\s*13px/)
  })
})
