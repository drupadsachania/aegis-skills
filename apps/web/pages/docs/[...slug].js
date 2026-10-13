'use strict'

const React = require('react')
const Layout = require('../../components/Layout')

const h = React.createElement

function DocPage ({ nav, title, description, html, href, editUrl }) {
  return h(Layout, { title, description },
    h('div', { className: 'container' },
      h('div', { className: 'docs-layout' },
        h('aside', { className: 'docs-nav', 'aria-label': 'Docs' },
          h('a', { href: '/docs' }, '← All docs'),
          ...nav.map(sec => h(React.Fragment, { key: sec.key },
            h('h4', null, sec.title),
            ...sec.pages.map(p => h('a', { key: p.href, href: p.href, 'aria-current': p.href === href ? 'page' : undefined }, p.title))))),
        h('article', null,
          h('div', { className: 'prose', dangerouslySetInnerHTML: { __html: html } }),
          h('p', { className: 'docs-edit' }, h('a', { href: editUrl, target: '_blank', rel: 'noopener noreferrer' }, 'Edit this page on GitHub ↗'))))))
}

async function getStaticPaths () {
  const { listDocs } = require('../../lib/docs')
  const { DOCS_DIR } = require('../../lib/site-paths')
  const paths = listDocs(DOCS_DIR).flatMap(sec => sec.pages.map(p => ({
    params: { slug: p.slug === 'index' ? [sec.key] : [sec.key, p.slug] }
  })))
  return { paths, fallback: false }
}

async function getStaticProps ({ params }) {
  const { listDocs, loadDoc, descriptionOf } = require('../../lib/docs')
  const { renderMarkdown } = require('../../lib/markdown')
  const { DOCS_DIR } = require('../../lib/site-paths')
  const section = params.slug[0]
  const slug = params.slug[1] || 'index'
  const extra = params.slug[2]
  if (extra) return { notFound: true }
  const doc = loadDoc(DOCS_DIR, section, slug)
  if (!doc) return { notFound: true }
  return {
    props: {
      nav: listDocs(DOCS_DIR),
      title: doc.title,
      description: descriptionOf(doc.markdown, `${doc.title}: Aegis and Themis documentation.`),
      html: renderMarkdown(doc.markdown, { docPath: doc.docPath }),
      href: doc.href,
      editUrl: `https://github.com/drupadsachania/aegis-skills/edit/main/${doc.docPath}`
    }
  }
}

module.exports = { default: DocPage, getStaticPaths, getStaticProps }
module.exports.default = DocPage
