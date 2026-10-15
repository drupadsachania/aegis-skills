#!/usr/bin/env node
'use strict'
// Builds the Aegis ChatGPT plugin ZIP (Agent Plugins format, with a remote read-only MCP server) for directory
// submission. Layout: plugin.json, mcp.json, README.md and assets/** from listings/chatgpt/ (plugin-readme.md
// becomes README.md), LICENSE, LICENSE-APACHE and LICENSE-MIT from packages/aegis, and skills/<name>/SKILL.md plus
// skills/<name>/references/*.md from packages/aegis/skills (the same files that ship on npm).
// mcp.json points at the hosted read-only server; there are no hooks and no apps (docs/listings/chatgpt-app.md).
// Nothing else from listings/chatgpt/ is packed, so review notes or credentials kept there never enter the ZIP.
// The finished ZIP is read back and validated (scripts/lib/release-validate.js) before the path is returned.
// Usage: node scripts/build-chatgpt-bundle.js --out <dir>
const fs = require('fs')
const path = require('path')
const lib = require('./lib/release-manifests')
const { createZip } = require('./lib/zip')
const { readZip } = require('./lib/zip-read')
const { chatgptProblems } = require('./lib/release-validate')

const SRC = 'listings/chatgpt'
const AEGIS = 'packages/aegis'

function listFiles (rel) {
  if (!lib.exists(rel)) return []
  const out = []
  const stack = ['']
  while (stack.length) {
    const sub = stack.pop()
    for (const e of fs.readdirSync(lib.abs(sub ? `${rel}/${sub}` : rel), { withFileTypes: true })) {
      const p = sub ? `${sub}/${e.name}` : e.name
      if (e.isDirectory()) stack.push(p)
      else if (e.isFile()) out.push(p)
    }
  }
  return out.sort()
}

function chatgptEntries () {
  const read = rel => fs.readFileSync(lib.abs(rel))
  const entries = [
    { name: 'plugin.json', data: read(`${SRC}/plugin.json`) },
    { name: 'mcp.json', data: read(`${SRC}/mcp.json`) },
    { name: 'README.md', data: read(`${SRC}/plugin-readme.md`) }
  ]
  for (const f of ['LICENSE', 'LICENSE-APACHE', 'LICENSE-MIT']) entries.push({ name: f, data: read(`${AEGIS}/${f}`) })
  for (const f of listFiles(`${SRC}/assets`)) entries.push({ name: `assets/${f}`, data: read(`${SRC}/assets/${f}`) })
  const skillsRoot = `${AEGIS}/skills`
  for (const s of fs.readdirSync(lib.abs(skillsRoot), { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort()) {
    if (!lib.exists(`${skillsRoot}/${s}/SKILL.md`)) continue
    entries.push({ name: `skills/${s}/SKILL.md`, data: read(`${skillsRoot}/${s}/SKILL.md`) })
    for (const r of listFiles(`${skillsRoot}/${s}/references`).filter(f => /^[A-Za-z0-9._-]+\.md$/.test(f))) {
      entries.push({ name: `skills/${s}/references/${r}`, data: read(`${skillsRoot}/${s}/references/${r}`) })
    }
  }
  return entries
}

// Returns the written file path, or null when listings/chatgpt/plugin.json does not exist. Throws when invalid.
function buildChatgptBundle (outDir) {
  if (!lib.exists(`${SRC}/plugin.json`)) return null
  const version = lib.readJson(`${AEGIS}/package.json`).data.version
  const buf = createZip(chatgptEntries())
  const problems = chatgptProblems(readZip(buf), version)
  if (problems.length) throw new Error(`ChatGPT bundle invalid:\n  - ${problems.join('\n  - ')}`)
  const file = path.join(outDir, `aegis-chatgpt-plugin-${version}.zip`)
  fs.writeFileSync(file, buf)
  return file
}

if (require.main === module) {
  const i = process.argv.indexOf('--out')
  if (i === -1 || !process.argv[i + 1]) { console.error('usage: node scripts/build-chatgpt-bundle.js --out <dir>'); process.exit(2) }
  const out = path.resolve(process.argv[i + 1])
  fs.mkdirSync(out, { recursive: true })
  try {
    const file = buildChatgptBundle(out)
    console.log(file ? `build-chatgpt-bundle: ${file.split(path.sep).join('/')}` : 'build-chatgpt-bundle: skipped (listings/chatgpt/plugin.json not present)')
    if (file) {
      const review = lib.readJson(`${SRC}/plugin.json`).data.extensions['com.openai'].review
      if (!review.demo_recording_url) console.log('build-chatgpt-bundle: NOTE demo_recording_url is empty — host the demo video and set it before submitting')
      if (!lib.readJson(`${AEGIS}/package.json`).data.version) {} // noop keeps lib import obvious
      const token = lib.exists('apps/web/config/openai-apps-challenge.txt') ? fs.readFileSync(lib.abs('apps/web/config/openai-apps-challenge.txt'), 'utf8').trim() : ''
      if (!token) console.log('build-chatgpt-bundle: NOTE domain-verification token is empty — paste the token OpenAI issues into apps/web/config/openai-apps-challenge.txt and redeploy')
    }
  } catch (e) { console.error(`build-chatgpt-bundle: ${e.message}`); process.exit(1) }
}

module.exports = { buildChatgptBundle, chatgptEntries }
