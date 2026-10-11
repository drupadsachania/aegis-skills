'use strict'

const React = require('react')
const Head = require('next/head').default || require('next/head')

const h = React.createElement
const SITE = 'Aegis + Themis'
const DEFAULT_DESCRIPTION = 'Open cybersecurity skill pack and a governed SOC agent that runs on your own AI. Apache-2.0 OR MIT.'
const REPO_URL = 'https://github.com/drupadsachania/aegis-skills'
const NAV = [
  { href: '/skills', label: 'Skills' },
  { href: '/paths', label: 'Choose a path' },
  { href: '/themis', label: 'Themis' },
  { href: '/mcp', label: 'Hosted MCP' },
  { href: '/docs', label: 'Docs' }
]
const FOOTER = [
  { href: '/security', label: 'Security' },
  { href: '/license', label: 'License' },
  { href: '/docs', label: 'Docs' }
]

const external = (href, label) => h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, label)

function Layout ({ title, description, children }) {
  return h(
    'div',
    { className: 'page-root' },
    h(Head, null,
      h('title', null, title ? `${title} · ${SITE}` : SITE),
      h('meta', { name: 'description', content: description || DEFAULT_DESCRIPTION })),
    h(
      'nav',
      { className: 'nav-root', 'aria-label': 'Main' },
      h('a', { href: '/', className: 'nav-brand' }, h('span', { className: 'nav-glyph' }), 'AEGIS · THEMIS'),
      h('ul', { className: 'nav-links' },
        ...NAV.map(l => h('li', { key: l.href }, h('a', { href: l.href }, l.label))),
        h('li', { key: 'github' }, external(REPO_URL, 'GitHub ↗')))
    ),
    h('main', { style: { position: 'relative', zIndex: 1 } }, children),
    h(
      'footer',
      { className: 'footer-root' },
      h('div', { className: 'footer-inner' },
        h('span', { className: 'footer-brand' }, SITE),
        h('div', { className: 'footer-right' },
          ...FOOTER.map(l => h('a', { key: l.label, href: l.href }, l.label)),
          external(REPO_URL, 'GitHub'),
          external('https://kairo-foundation.org', 'Kairo Foundation'),
          h('span', { className: 'footer-copy' }, 'Apache-2.0 OR MIT')))
    )
  )
}

module.exports = Layout
module.exports.default = Layout
