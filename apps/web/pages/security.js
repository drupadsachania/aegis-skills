'use strict'

const React = require('react')
const Layout = require('../components/Layout')

const h = React.createElement

function SecurityPage ({ securityHtml, hasComplianceMapping }) {
  return h(Layout, { title: 'Security', description: 'Security policy, vulnerability reporting and how the site is hardened.' },
    h('div', { className: 'container', style: { paddingBottom: '120px' } },
      h('div', { className: 'page-head' }, h('h1', null, 'Security')),
      h('div', { className: 'prose', dangerouslySetInnerHTML: { __html: securityHtml } }),
      h('div', { className: 'prose' },
        h('h2', null, 'How this site is built'),
        h('ul', null,
          h('li', null, 'No model calls, no accounts, no cookies, no analytics, no database.'),
          h('li', null, 'Every API is read-only and serves public skill content only.'),
          h('li', null, 'Strict security headers on every response: HSTS, a same-origin Content-Security-Policy, X-Frame-Options DENY, nosniff and a locked-down Permissions-Policy.'),
          h('li', null, 'Docs are rendered from repository markdown with all raw HTML escaped.')),
        h('h2', null, 'Compliance mapping'),
        hasComplianceMapping
          ? h('p', null, 'Themis controls mapped to OWASP Top 10 for LLM and Agentic applications and the NIST AI RMF: ',
            h('a', { href: '/docs/themis/compliance-mapping' }, 'read the mapping'), '.')
          : h('p', null, 'The mapping of Themis controls to OWASP Top 10 for LLM and Agentic applications and the NIST AI RMF is published with the next release.'))))
}

async function getStaticProps () {
  const fs = require('fs')
  const path = require('path')
  const { REPO_ROOT, DOCS_DIR } = require('../lib/site-paths')
  const { renderMarkdown } = require('../lib/markdown')
  const md = fs.readFileSync(path.join(REPO_ROOT, 'SECURITY.md'), 'utf8')
  return {
    props: {
      securityHtml: renderMarkdown(md, { docPath: 'SECURITY.md' }),
      hasComplianceMapping: fs.existsSync(path.join(DOCS_DIR, 'themis', 'compliance-mapping.md'))
    }
  }
}

module.exports = { default: SecurityPage, getStaticProps }
module.exports.default = SecurityPage
