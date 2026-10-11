'use strict'

const { renderMarkdown, rewriteHref } = require('../../lib/markdown')

test('renders GFM tables and code', () => {
  const html = renderMarkdown('| a | b |\n|---|---|\n| 1 | 2 |\n\n`x`')
  expect(html).toContain('<table>')
  expect(html).toContain('<code>x</code>')
})

test('escapes block and inline raw HTML', () => {
  const html = renderMarkdown('<script>alert(1)</script>\n\nhello <b onclick="x()">bold</b>')
  expect(html).not.toMatch(/<script|<b /)
  expect(html).toContain('&lt;script&gt;')
  expect(html).toContain('&lt;b onclick=')
})

test('neutralises non-http link schemes', () => {
  expect(renderMarkdown('[x](javascript:alert(1))')).not.toContain('javascript:')
})

test('rewrites relative doc links to site routes and repo files to GitHub', () => {
  const at = 'docs/aegis/install.md'
  expect(rewriteHref('./mcp.md', at)).toBe('/docs/aegis/mcp')
  expect(rewriteHref('../themis/index.md#modes', at)).toBe('/docs/themis#modes')
  expect(rewriteHref('../../SECURITY.md', at)).toBe('https://github.com/drupadsachania/aegis-skills/blob/main/SECURITY.md')
  expect(rewriteHref('https://example.com', at)).toBe('https://example.com')
  expect(rewriteHref('/skills', at)).toBe('/skills')
  expect(rewriteHref('#top', at)).toBe('#top')
})
