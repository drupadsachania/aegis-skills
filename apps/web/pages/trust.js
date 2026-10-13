'use strict'

const React = require('react')
const Layout = require('../components/Layout')
const FlowDiagram = require('../components/FlowDiagram')

const h = React.createElement

// The words come from docs/trust/data-flow.md (one source, rendered here); the diagram is the only
// part written in code. Split at the first "## " heading: lede above, details below the diagram.
function splitSource (md) {
  const i = md.search(/^## /m)
  const head = md.slice(0, i)
  return {
    title: (/^#\s+(.+?)\s*$/m.exec(head) || [null, 'Trust and data flow'])[1],
    lede: head.replace(/^#\s+.+$/m, '').trim(),
    body: md.slice(i)
  }
}

function TrustPage ({ title, ledeHtml, bodyHtml, editUrl }) {
  return h(Layout, { title, description: 'What runs where, which outside services each Aegis and Themis path contacts, what is stored and what leaves your machine, with the files that back every claim.' },
    h('div', { className: 'container', style: { paddingBottom: '120px' } },
      h('div', { className: 'page-head' },
        h('div', { className: 'eyebrow' }, 'Trust'),
        h('h1', null, 'Trust and ', h('em', null, 'data flow')),
        h('div', { className: 'trust-lede prose', dangerouslySetInnerHTML: { __html: ledeHtml } })),
      h('div', { className: 'fd-wrap', 'data-reveal': '' }, h(FlowDiagram)),
      h('div', { className: 'prose trust-prose', dangerouslySetInnerHTML: { __html: bodyHtml } }),
      h('p', { className: 'docs-edit' }, h('a', { href: editUrl, target: '_blank', rel: 'noopener noreferrer' }, 'Edit this page on GitHub ↗'))))
}

async function getStaticProps () {
  const fs = require('fs')
  const path = require('path')
  const { DOCS_DIR } = require('../lib/site-paths')
  const { renderMarkdown } = require('../lib/markdown')
  const docPath = 'docs/trust/data-flow.md'
  const md = fs.readFileSync(path.join(DOCS_DIR, 'trust', 'data-flow.md'), 'utf8')
  const { title, lede, body } = splitSource(md)
  return {
    props: {
      title,
      ledeHtml: renderMarkdown(lede, { docPath }),
      bodyHtml: renderMarkdown(body, { docPath }),
      editUrl: `https://github.com/drupadsachania/aegis-skills/edit/main/${docPath}`
    }
  }
}

module.exports = { default: TrustPage, getStaticProps, splitSource }
module.exports.default = TrustPage
