'use strict'

const React = require('react')
const Layout = require('../components/Layout')
const PathsByProduct = require('../components/PathsByProduct')
const InstallTabs = require('../components/InstallTabs')
const StatusPill = require('../components/StatusPill')

const h = React.createElement

function PathsPage ({ paths }) {
  return h(
    Layout,
    { title: 'Choose your path', description: 'Five ways to use Aegis and Themis, from zero install to a local SOC dashboard.' },
    h('div', { className: 'container', style: { paddingBottom: '120px' } },
      h('div', { className: 'page-head' },
        h('div', { className: 'eyebrow' }, 'Install'),
        h('h1', null, 'Choose your ', h('em', null, 'path')),
        h('p', null, 'Aegis and Themis install differently, so each has its own paths below, all using the same skills. Aegis is available now, in three ways. Themis is in development, with two paths that are marked as such.'),
        h('p', { className: 'status-note' }, 'Just want to read skills from your chat AI? The ', h('a', { href: '/mcp' }, 'hosted MCP'), ' needs no install. Also see the ', h('a', { href: '/security' }, 'security'), ' and ', h('a', { href: '/license' }, 'license'), ' pages.')),
      h(PathsByProduct, { paths }),
      ...paths.map(p => h('section', { key: p.id, id: p.id, className: 'path-section', 'data-reveal': '' },
        h('h2', null, p.title, p.status ? h(StatusPill, { status: p.status, className: 'h-status' }) : null),
        h('p', { className: 'path-for' }, `FOR · ${p.audience.toUpperCase()}`),
        h('p', null, p.how),
        h(InstallTabs, { tabs: p.platforms }),
        h('p', { style: { marginTop: '20px' } }, h('a', { href: p.docs }, 'Full guide →')))))
  )
}

async function getStaticProps () {
  const { PATHS } = require('../lib/install-commands')
  return { props: { paths: PATHS } }
}

module.exports = { default: PathsPage, getStaticProps }
module.exports.default = PathsPage
