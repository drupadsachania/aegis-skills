'use strict'

const React = require('react')
const Layout = require('../../components/Layout')

const h = React.createElement

function DocsHub ({ nav }) {
  return h(Layout, { title: 'Docs', description: 'Documentation for Aegis, Themis, the hosted MCP and the website.' },
    h('div', { className: 'container', style: { paddingBottom: '120px' } },
      h('div', { className: 'page-head' },
        h('h1', null, 'Docs'),
        h('p', null, 'Install guides, the hosted MCP, how Themis governs tools, and how the site is built. Every page is rendered from markdown in the repository.')),
      h('div', { className: 'doc-cards' },
        ...nav.map(sec => h('div', { key: sec.key, className: 'doc-card' },
          h('h3', null, sec.title),
          h('p', null, sec.blurb),
          h('ul', null, ...sec.pages.map(p => h('li', { key: p.href }, h('a', { href: p.href }, p.title)))))))))
}

async function getStaticProps () {
  const { listDocs } = require('../../lib/docs')
  const { DOCS_DIR } = require('../../lib/site-paths')
  return { props: { nav: listDocs(DOCS_DIR) } }
}

module.exports = { default: DocsHub, getStaticProps }
module.exports.default = DocsHub
