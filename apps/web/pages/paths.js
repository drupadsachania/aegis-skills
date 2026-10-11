'use strict'

const React = require('react')
const Layout = require('../components/Layout')
const PathMatrix = require('../components/PathMatrix')
const InstallTabs = require('../components/InstallTabs')

const h = React.createElement

function PathsPage ({ paths }) {
  return h(
    Layout,
    { title: 'Choose your path', description: 'Five ways to use Aegis and Themis, from zero install to a local SOC dashboard.' },
    h('div', { className: 'container', style: { paddingBottom: '120px' } },
      h('div', { className: 'page-head' },
        h('h1', null, 'Choose your path'),
        h('p', null, 'Five ways in, all using the same skills. Pick the lightest one that does the job.')),
      h(PathMatrix, { paths }),
      ...paths.map(p => h('section', { key: p.id, id: p.id, className: 'path-section' },
        h('h2', null, p.title),
        h('p', { className: 'path-for' }, `FOR · ${p.audience.toUpperCase()}`),
        h('p', null, p.how),
        h(InstallTabs, { tabs: p.platforms }),
        h('p', null, h('a', { href: p.docs }, 'Full guide →')))))
  )
}

async function getStaticProps () {
  const { PATHS } = require('../lib/install-commands')
  return { props: { paths: PATHS } }
}

module.exports = { default: PathsPage, getStaticProps }
module.exports.default = PathsPage
