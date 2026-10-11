'use strict'

/** Static guard: movement only exists inside prefers-reduced-motion: no-preference. */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '..', '..', 'styles', 'globals.css'), 'utf8').split('\r\n').join('\n')

// Split into top-level chunks, tracking brace depth, tagging each with its enclosing @media prelude.
function topLevel (src) {
  const out = []
  let depth = 0; let start = 0
  for (let i = 0; i < src.length; i++) {
    if (src[i] === '{') depth++
    else if (src[i] === '}') { depth--; if (depth === 0) { out.push(src.slice(start, i + 1)); start = i + 1 } }
  }
  return out
}
const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '')
const chunks = topLevel(noComments)
const outside = chunks.filter(c => !/^\s*@media[^{]*prefers-reduced-motion: no-preference/.test(c)).join('\n')

test('hidden reveal states, reveal/line animations and transforms on hover are all gated', () => {
  expect(outside).not.toMatch(/data-reveal-state/)
  expect(outside).not.toMatch(/animation:\s*k-(reveal|line-in|fade-up|braille|pop)/)
  expect(outside).not.toMatch(/:hover[^{]*\{[^}]*transform:\s*translate/)
})

test('hover lift and arrow morph also require a fine, hovering pointer', () => {
  expect(css).toMatch(/@media \(hover: hover\) and \(pointer: fine\) and \(prefers-reduced-motion: no-preference\)/)
})

test('keeps a reduced-motion safety net', () => {
  expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/)
})
