'use strict'

const path = require('path')
const { Marked } = require('marked')

const REPO_BLOB = 'https://github.com/drupadsachania/aegis-skills/blob/main/'
const SAFE_SCHEME = /^(https?:|mailto:)/i
const ANY_SCHEME = /^[a-z][a-z0-9+.-]*:/i

function escapeHtml (s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// docPath: source file relative to the repo root, POSIX style (e.g. 'docs/aegis/install.md').
function rewriteHref (href, docPath) {
  if (!href) return href
  if (ANY_SCHEME.test(href)) return SAFE_SCHEME.test(href) ? href : '#'
  if (href.startsWith('#') || href.startsWith('/') || !docPath) return href
  const [target, hash] = href.split('#')
  const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(docPath), target))
  if (resolved.startsWith('..')) return '#'
  const m = /^docs\/(aegis|themis|web)\/([a-z0-9-]+)\.md$/.exec(resolved)
  const out = m ? (m[2] === 'index' ? `/docs/${m[1]}` : `/docs/${m[1]}/${m[2]}`) : REPO_BLOB + resolved
  return hash ? `${out}#${hash}` : out
}

// Repo-authored markdown → HTML. Raw HTML is always escaped, never passed through.
function renderMarkdown (md, { docPath = null } = {}) {
  const marked = new Marked({
    gfm: true,
    async: false,
    walkTokens (token) {
      if (token.type === 'link' || token.type === 'image') token.href = rewriteHref(token.href, docPath)
    },
    renderer: {
      html (token) { return escapeHtml(token.text) }
    }
  })
  return marked.parse(String(md))
}

module.exports = { renderMarkdown, rewriteHref, escapeHtml }
