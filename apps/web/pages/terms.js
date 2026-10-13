'use strict'

const React = require('react')
const Layout = require('../components/Layout')

const h = React.createElement

const DOC_PATH = 'docs/legal/terms.md'

// docs/legal/terms.md is the single source. It may hold HTML comments for the owner (for example the
// governing-law placeholder); they never reach the page, only the visible sentence next to them does.
function prepare (md) {
  const text = String(md).replace(/<!--[\s\S]*?-->\s*\n?/g, '')
  const title = (/^#\s+(.+?)\s*$/m.exec(text) || [null, 'Terms of Service'])[1]
  const body = text.replace(/^#\s+.+$/m, '').trim()
  const meta = /^Version\s+([\w.]+)\.\s+Last updated:\s*(\d{4}-\d{2}-\d{2})\.?\s*$/m.exec(body)
  return { title, body, version: meta ? meta[1] : null, updated: meta ? meta[2] : null }
}

function TermsPage ({ title, bodyHtml, version, updated, editUrl }) {
  return h(Layout, { title, description: 'The terms for using the Aegis and Themis website and the hosted read-only Aegis MCP server: open-source licences, authorised and defensive use, no warranty and fair use.' },
    h('div', { className: 'container', style: { paddingBottom: '120px' } },
      h('div', { className: 'page-head' },
        h('div', { className: 'eyebrow' }, 'Trust'),
        h('h1', null, 'Terms of ', h('em', null, 'Service')),
        version ? h('p', { className: 'status-note' }, `Version ${version} · Last updated ${updated}`) : null),
      h('div', { className: 'prose terms-prose', dangerouslySetInnerHTML: { __html: bodyHtml } }),
      h('p', { className: 'docs-edit' }, h('a', { href: editUrl, target: '_blank', rel: 'noopener noreferrer' }, 'Edit this page on GitHub ↗'))))
}

async function getStaticProps () {
  const fs = require('fs')
  const path = require('path')
  const { REPO_ROOT } = require('../lib/site-paths')
  const { renderMarkdown } = require('../lib/markdown')
  const md = fs.readFileSync(path.join(REPO_ROOT, DOC_PATH), 'utf8')
  const { title, body, version, updated } = prepare(md)
  // The version line is shown in the page head, so it is dropped from the body.
  const bodyHtml = renderMarkdown(body.replace(/^Version\s+[\w.]+\.\s+Last updated:.*$/m, '').trim(), { docPath: DOC_PATH })
  return {
    props: {
      title,
      bodyHtml,
      version,
      updated,
      editUrl: `https://github.com/drupadsachania/aegis-skills/edit/main/${DOC_PATH}`
    }
  }
}

module.exports = { default: TermsPage, getStaticProps, prepare }
module.exports.default = TermsPage
