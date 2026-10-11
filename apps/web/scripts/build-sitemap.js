#!/usr/bin/env node
'use strict'

/**
 * Writes public/sitemap.xml at build time (git-ignored, like public/downloads).
 * Lists the static pages, the skill pages, the docs pages and /trust, /terms, /quickstart.
 * Wired into predev and prebuild. Reads no environment variables: the origin comes from lib/site-url.js.
 *
 *   node scripts/build-sitemap.js            write public/sitemap.xml
 */
const fs = require('fs')
const path = require('path')
const { SITE_URL } = require('../lib/site-url')
const { SKILLS_DIR, DOCS_DIR, WEB_ROOT } = require('../lib/site-paths')
const { listDocs } = require('../lib/docs')

const OUT = path.join(WEB_ROOT, 'public', 'sitemap.xml')
const STATIC_ROUTES = ['/', '/quickstart', '/skills', '/paths', '/themis', '/mcp', '/docs', '/trust', '/security', '/terms', '/license']

function skillRoutes (skillsDir = SKILLS_DIR) {
  return fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && fs.existsSync(path.join(skillsDir, e.name, 'SKILL.md')))
    .map(e => `/skills/${e.name}`)
    .sort()
}

function docRoutes (docsDir = DOCS_DIR) {
  return listDocs(docsDir).flatMap(sec => sec.pages.map(p => p.href))
}

function collectRoutes (opts = {}) {
  const all = [...STATIC_ROUTES, ...skillRoutes(opts.skillsDir), ...docRoutes(opts.docsDir)]
  return [...new Set(all)]
}

const escapeXml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function buildSitemap (routes, siteUrl = SITE_URL) {
  const urls = routes.map(r => `  <url><loc>${escapeXml(siteUrl + (r === '/' ? '/' : r))}</loc></url>`)
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
}

function write (outFile = OUT) {
  const routes = collectRoutes()
  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  fs.writeFileSync(outFile, buildSitemap(routes))
  return { outFile, count: routes.length }
}

if (require.main === module) {
  const { outFile, count } = write()
  console.log(`build-sitemap: ${count} urls -> ${path.relative(process.cwd(), outFile) || outFile}`)
}

module.exports = { STATIC_ROUTES, collectRoutes, buildSitemap, skillRoutes, docRoutes, write, OUT }
