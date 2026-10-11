'use strict'

const React = require('react')
const Layout = require('../components/Layout')

const h = React.createElement

const LINKS = [
  { href: '/', label: 'Home', text: 'Start again from the front page.' },
  { href: '/skills', label: 'Browse skills', text: 'All 24 Aegis skills, grouped by family.' },
  { href: '/docs', label: 'Read the docs', text: 'Install guides, the hosted MCP and how Themis governs tools.' },
  { href: '/quickstart', label: 'Quick start', text: 'Try a skill in two minutes, no account needed.' }
]

function NotFoundPage () {
  return h(Layout, { title: 'Page not found', description: 'This page does not exist. Browse the Aegis skills, read the docs or start from the home page.' },
    h('div', { className: 'container', style: { paddingBottom: '120px' } },
      h('div', { className: 'page-head' },
        h('div', { className: 'eyebrow' }, '404'),
        h('h1', null, 'Page ', h('em', null, 'not found')),
        h('p', null, 'There is nothing at this address. It may have moved, or the link may be mistyped. These are good places to continue.')),
      h('section', { className: 'doc-section' },
        h('ul', { className: 'bullets nf-links' },
          ...LINKS.map(l => h('li', { key: l.href }, h('a', { href: l.href }, l.label), ': ', l.text))))))
}

module.exports = NotFoundPage
module.exports.default = NotFoundPage
