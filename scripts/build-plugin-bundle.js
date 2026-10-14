#!/usr/bin/env node
'use strict'

/**
 * Build the Claude plugin bundle for Aegis: plugins/aegis/.
 *
 * packages/aegis is the npm package: it also holds the installer and the local MCP server (cli/, lib/, mcp/, tests/).
 * A Claude plugin installed from this repository copies its whole folder, and the Anthropic validator reads every
 * file in it. The installer legitimately reads and edits other tools' config files (for example ~/.claude.json), which
 * the validator reports as a credential read beside a network call. The plugin needs none of that code: it is the 24
 * skills plus the hosted MCP entry. So the marketplace points at this smaller, generated bundle.
 *
 * Source of truth stays in packages/aegis (skills, .claude-plugin/plugin.json, .mcp.json, licences) plus
 * listings/claude/aegis-plugin-readme.md and design/brand/plugin-icon-aegis.png. Never edit plugins/aegis by hand.
 *
 *   node scripts/build-plugin-bundle.js           write plugins/aegis
 *   node scripts/build-plugin-bundle.js --check   exit 1 if plugins/aegis differs from what would be written
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const SRC = path.join(ROOT, 'packages', 'aegis')
const OUT = path.join(ROOT, 'plugins', 'aegis')

const rel = p => p.split(path.sep).join('/')
const read = p => fs.readFileSync(p)

function walk (dir, base = dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const full = path.join(dir, e.name)
    return e.isDirectory() ? walk(full, base) : [rel(path.relative(base, full))]
  })
}

/** Map of bundle path -> Buffer. */
function collect () {
  const files = new Map()
  const put = (to, from) => files.set(to, read(from))

  put('.claude-plugin/plugin.json', path.join(SRC, '.claude-plugin', 'plugin.json'))
  put('.claude-plugin/icon.png', path.join(ROOT, 'design', 'brand', 'plugin-icon-aegis.png'))
  put('.mcp.json', path.join(SRC, '.mcp.json'))
  put('README.md', path.join(ROOT, 'listings', 'claude', 'aegis-plugin-readme.md'))
  for (const l of ['LICENSE', 'LICENSE-APACHE', 'LICENSE-MIT']) put(l, path.join(SRC, l))

  const skillsDir = path.join(SRC, 'skills')
  for (const e of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue
    const dir = path.join(skillsDir, e.name)
    for (const f of walk(dir)) {
      // The same set the installer copies: SKILL.md, skill.json and references/. Never intel-state.json or anything else.
      if (f === 'SKILL.md' || f === 'skill.json' || f.startsWith('references/')) put(`skills/${e.name}/${f}`, path.join(dir, f))
    }
  }
  return files
}

function main () {
  const check = process.argv.includes('--check')
  const want = collect()
  const have = new Map(walk(OUT).map(f => [f, read(path.join(OUT, f))]))
  const problems = []
  for (const [f, data] of want) {
    if (!have.has(f)) problems.push(`missing: plugins/aegis/${f}`)
    else if (!have.get(f).equals(data)) problems.push(`differs: plugins/aegis/${f}`)
  }
  for (const f of have.keys()) if (!want.has(f)) problems.push(`stale: plugins/aegis/${f}`)

  if (check) {
    if (problems.length) {
      console.error(`build-plugin-bundle: plugins/aegis is out of date (${problems.length} file(s)). Run: node scripts/build-plugin-bundle.js`)
      for (const p of problems.slice(0, 12)) console.error('  ' + p)
      process.exit(1)
    }
    console.log(`build-plugin-bundle: OK (${want.size} files)`)
    return
  }
  fs.rmSync(OUT, { recursive: true, force: true })
  for (const [f, data] of want) {
    const to = path.join(OUT, f)
    fs.mkdirSync(path.dirname(to), { recursive: true })
    fs.writeFileSync(to, data)
  }
  console.log(`build-plugin-bundle: wrote ${want.size} files to plugins/aegis`)
}

main()
