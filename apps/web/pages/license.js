'use strict'

const React = require('react')
const Layout = require('../components/Layout')

const h = React.createElement
const BLOB = 'https://github.com/drupadsachania/aegis-skills/blob/main/'

function LicensePage ({ licenseText }) {
  return h(Layout, { title: 'License', description: 'Aegis and Themis are dual-licensed Apache-2.0 OR MIT.' },
    h('div', { className: 'container', style: { paddingBottom: '120px' } },
      h('div', { className: 'page-head' },
        h('h1', null, 'License'),
        h('p', null, 'Every package in this repository is licensed under Apache-2.0 OR MIT, at your option. SPDX: (Apache-2.0 OR MIT).')),
      h('div', { className: 'prose' },
        h('ul', null,
          h('li', null, h('a', { href: BLOB + 'LICENSE-APACHE' }, 'Apache License 2.0 (LICENSE-APACHE)')),
          h('li', null, h('a', { href: BLOB + 'LICENSE-MIT' }, 'MIT License (LICENSE-MIT)'))),
        h('pre', null, licenseText))))
}

async function getStaticProps () {
  const fs = require('fs')
  const path = require('path')
  const { REPO_ROOT } = require('../lib/site-paths')
  return { props: { licenseText: fs.readFileSync(path.join(REPO_ROOT, 'LICENSE'), 'utf8') } }
}

module.exports = { default: LicensePage, getStaticProps }
module.exports.default = LicensePage
