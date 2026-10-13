'use strict'

const fs = require('fs')
const path = require('path')

const SECTIONS = [
  { key: 'aegis', title: 'Aegis', blurb: 'The skill pack: install, prompts, MCP (local and hosted), CLI, format and intel.',
    pages: ['index', 'getting-started', 'install', 'single-file-prompts', 'mcp', 'hosted-mcp', 'cli', 'skill-format', 'intel'] },
  { key: 'themis', title: 'Themis', blurb: 'The SOC agent, in development: plugin mode, standalone app and governance. Local-first today; not published yet.',
    pages: ['index', 'mode-1-plugin', 'mode-2-app', 'governance', 'workflow', 'configuration', 'versions', 'compliance-mapping', 'threat-model-atlas', 'privacy-policy', 'test-prompts', 'dual-use-review'] }
]
const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/

function titleOf (markdown, fallback) {
  const m = /^#\s+(.+?)\s*$/m.exec(markdown)
  return m ? m[1] : fallback
}

// First prose paragraph after the H1, as plain text, for <meta name="description"> (at most 160 characters).
function descriptionOf (markdown, fallback = '') {
  const body = markdown.replace(/^#\s+.+$/m, '')
  for (const para of body.split(/\n\s*\n/)) {
    const t = para.trim()
    if (!t || /^(#|\||```|[-*>]|\d+\.|<)/.test(t)) continue
    const plain = t.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/<([^>]+)>/g, '$1').replace(/[`*_]/g, '').replace(/\s+/g, ' ')
    if (plain.length <= 160) return plain
    const cut = plain.slice(0, 157)
    return cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:.]+$/, '') + '...'
  }
  return fallback
}

const hrefOf = (section, slug) => (slug === 'index' ? `/docs/${section}` : `/docs/${section}/${slug}`)

function listDocs (docsDir) {
  return SECTIONS.map(sec => {
    const dir = path.join(docsDir, sec.key)
    const onDisk = fs.existsSync(dir)
      ? fs.readdirSync(dir).filter(f => f.endsWith('.md')).map(f => f.slice(0, -3)).filter(s => SLUG.test(s))
      : []
    const ordered = sec.pages.filter(p => onDisk.includes(p))
      .concat(onDisk.filter(p => !sec.pages.includes(p)).sort())
    return {
      key: sec.key,
      title: sec.title,
      blurb: sec.blurb,
      pages: ordered.map(slug => ({
        slug,
        title: titleOf(fs.readFileSync(path.join(dir, `${slug}.md`), 'utf8'), slug),
        href: hrefOf(sec.key, slug)
      }))
    }
  })
}

function loadDoc (docsDir, section, slug = 'index') {
  if (!SECTIONS.some(s => s.key === section) || typeof slug !== 'string' || !SLUG.test(slug)) return null
  const file = path.join(docsDir, section, `${slug}.md`)
  if (!fs.existsSync(file)) return null
  const markdown = fs.readFileSync(file, 'utf8')
  return { section, slug, title: titleOf(markdown, slug), markdown, docPath: `docs/${section}/${slug}.md`, href: hrefOf(section, slug) }
}

module.exports = { SECTIONS, listDocs, loadDoc, titleOf, descriptionOf }
