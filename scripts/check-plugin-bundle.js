#!/usr/bin/env node
'use strict'

/**
 * Pre-submission bundle check for the two Claude plugin folders. It mirrors the
 * Anthropic plugin directory checklist (docs/listings/anthropic-plugin.md):
 *   blockers: README under 40 words, no LICENSE, unpinned npx/uvx launcher, invalid YAML
 *             front matter, wrong skills/ or SKILL.md capitalisation, non-ASCII names,
 *             reserved names, paths outside the plugin folder, real credentials
 *   holds:    more than 512 files, a file over 256 KiB, binaries other than images and
 *             fonts, lockfiles, minified code (reported, and they also fail this check so
 *             a human decides before submitting)
 * It never contacts the network and does not replace `claude plugin validate`.
 * Usage: node scripts/check-plugin-bundle.js        (exit 1 on any problem)
 */

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const matter = require('gray-matter')

const ROOT = path.join(__dirname, '..')
const PLUGINS = ['plugins/aegis', 'packages/themis-plugin']
const MIN_README_WORDS = 40
const MAX_FILES = 512
const MAX_BYTES = 256 * 1024
const RESERVED = new Set(['claude', 'official', 'test'])
const ALLOWED_BINARY = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.avif', '.woff', '.woff2', '.ttf', '.otf'])
const BINARY_EXT = new Set(['.zip', '.gz', '.tgz', '.tar', '.exe', '.dll', '.so', '.dylib', '.bin', '.wasm', '.pdf', '.node', '.jar', '.class', '.7z', '.mp3', '.mp4', '.mov', '.db', '.sqlite'])
const LOCKFILES = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'npm-shrinkwrap.json', 'bun.lockb', 'uv.lock'])
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', '.next'])
const LAUNCHERS = new Set(['npx', 'uvx', 'bunx'])
const EXACT = /^(?:@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*@\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/
const CREDENTIAL = /(?:sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{30,}|AKIA(?![0-9A-Z]*EXAMPLE)[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/

function walk (dir, rel = '') {
  return fs.readdirSync(path.join(dir, rel), { withFileTypes: true }).flatMap(e => {
    const r = rel ? `${rel}/${e.name}` : e.name
    if (e.isDirectory()) return SKIP_DIRS.has(e.name) ? [] : walk(dir, r)
    return [r]
  })
}

/** Files that would ship: tracked or untracked-but-not-ignored files when in a git repo, else a plain walk. */
function listFiles (dir) {
  try {
    const out = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', '.'], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    const files = out.split('\0').filter(Boolean)
    if (files.length) return files.filter(f => fs.existsSync(path.join(dir, f)))
  } catch (e) { /* not a repository */ }
  return walk(dir)
}

function words (text) { return (text.match(/\S+/g) || []).length }

function collectLaunchers (json) {
  const servers = json && (json.mcpServers || (json.mcp && json.mcp.servers)) || {}
  return Object.entries(servers).filter(([, s]) => s && typeof s.command === 'string')
}

function checkLauncher (name, server) {
  const cmd = path.basename(server.command).replace(/\.(cmd|exe)$/i, '')
  const args = Array.isArray(server.args) ? server.args : []
  if (!LAUNCHERS.has(cmd)) return []
  const pkg = args.find(a => typeof a === 'string' && !a.startsWith('-'))
  if (!pkg) return [`launcher "${name}" runs ${cmd} with no package argument`]
  return EXACT.test(pkg) ? [] : [`launcher "${name}" runs ${cmd} ${pkg}: pin an exact version (name@1.2.3), not a range or latest`]
}

function stringsIn (v, out = []) {
  if (typeof v === 'string') out.push(v)
  else if (Array.isArray(v)) v.forEach(x => stringsIn(x, out))
  else if (v && typeof v === 'object') Object.values(v).forEach(x => stringsIn(x, out))
  return out
}

function checkFrontmatter (dir, rel, errors) {
  const text = fs.readFileSync(path.join(dir, rel), 'utf8')
  if (!/^---\r?\n/.test(text)) { errors.push(`${rel}: no YAML front matter`); return }
  try {
    const data = matter(text).data
    if (!data || typeof data.name !== 'string' || !data.name) errors.push(`${rel}: front matter needs a "name"`)
    if (!data || typeof data.description !== 'string' || !data.description) errors.push(`${rel}: front matter needs a "description"`)
  } catch (e) {
    errors.push(`${rel}: invalid YAML front matter (${String(e.message).split('\n')[0]})`)
  }
}

/** Returns an array of problem strings for one plugin folder. */
function checkPlugin (dir) {
  const errors = []
  const files = listFiles(dir)

  // README
  const readme = files.find(f => f === 'README.md')
  if (!readme) errors.push('README.md is missing')
  else {
    const n = words(fs.readFileSync(path.join(dir, readme), 'utf8'))
    if (n < MIN_README_WORDS) errors.push(`README.md has ${n} words (minimum ${MIN_README_WORDS})`)
  }

  // LICENSE
  if (!files.some(f => /^LICENSE(?:[-.].+)?$/.test(f))) errors.push('no LICENSE file in the plugin folder')

  // Names
  for (const f of files) {
    // eslint-disable-next-line no-control-regex
    if (/[^\x00-\x7F]/.test(f)) errors.push(`non-ASCII file or folder name: ${f}`)
  }

  // Manifest
  const manifestPath = '.claude-plugin/plugin.json'
  let manifest = null
  if (!files.includes(manifestPath)) errors.push(`${manifestPath} is missing`)
  else {
    try { manifest = JSON.parse(fs.readFileSync(path.join(dir, manifestPath), 'utf8')) } catch (e) { errors.push(`${manifestPath} is not valid JSON`) }
  }
  if (manifest) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(manifest.name || '')) errors.push(`plugin name "${manifest.name}" must be lowercase letters, digits and hyphens`)
    for (const part of String(manifest.name || '').split('-')) {
      if (RESERVED.has(part)) errors.push(`plugin name "${manifest.name}" contains the reserved word "${part}"`)
    }
    for (const s of stringsIn(manifest)) {
      if (/(^|[\\/])\.\.([\\/]|$)/.test(s) && !/^https?:/.test(s)) errors.push(`${manifestPath}: path outside the plugin folder: ${s}`)
    }
    for (const [n, s] of collectLaunchers(manifest)) errors.push(...checkLauncher(n, s))
  }

  // Launchers in .mcp.json and gemini-extension.json
  for (const f of ['.mcp.json', 'gemini-extension.json']) {
    if (!files.includes(f)) continue
    try {
      const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
      for (const [n, s] of collectLaunchers(j)) errors.push(...checkLauncher(`${f}:${n}`, s))
    } catch (e) { errors.push(`${f} is not valid JSON`) }
  }
  if (files.some(f => ['.npmrc', 'bunfig.toml', 'uv.toml'].includes(f))) errors.push('.npmrc, bunfig.toml or uv.toml present (blocks a plugin that runs a launcher)')

  // Skills and agents
  const skillDirs = files.filter(f => /^skills?\//i.test(f))
  if (files.some(f => /^skills?\//i.test(f) && !f.startsWith('skills/'))) errors.push('the skills folder must be named "skills" (lowercase)')
  const skillNames = new Set(skillDirs.filter(f => f.startsWith('skills/')).map(f => f.split('/')[1]).filter(n => files.some(x => x.startsWith(`skills/${n}/`))))
  for (const n of skillNames) {
    const inner = files.filter(f => f.startsWith(`skills/${n}/`) && f.split('/').length === 3).map(f => f.split('/')[2])
    if (inner.some(f => /^skill\.md$/i.test(f) && f !== 'SKILL.md')) errors.push(`skills/${n}: file must be named exactly SKILL.md`)
    if (!inner.includes('SKILL.md')) errors.push(`skills/${n}: SKILL.md is missing`)
    else checkFrontmatter(dir, `skills/${n}/SKILL.md`, errors)
  }
  if (files.some(f => /^agents?\//i.test(f) && !f.startsWith('agents/'))) errors.push('the agents folder must be named "agents" (lowercase)')
  for (const f of files.filter(f => /^agents\/[^/]+\.md$/.test(f))) checkFrontmatter(dir, f, errors)

  // Size, count and type (reviewer holds)
  if (files.length > MAX_FILES) errors.push(`${files.length} files (hold limit ${MAX_FILES})`)
  for (const f of files) {
    const ext = path.extname(f).toLowerCase()
    const size = fs.statSync(path.join(dir, f)).size
    if (size > MAX_BYTES) errors.push(`${f}: ${Math.round(size / 1024)} KiB (hold limit 256 KiB)`)
    if (BINARY_EXT.has(ext) && !ALLOWED_BINARY.has(ext)) errors.push(`${f}: binary file that is not an image or font`)
    if (LOCKFILES.has(path.basename(f))) errors.push(`${f}: lockfile (held for a reviewer)`)
    if (/\.min\.(js|css)$/.test(f)) errors.push(`${f}: minified code (held for a reviewer)`)
  }

  // Credentials in small text files
  for (const f of files) {
    if (fs.statSync(path.join(dir, f)).size > MAX_BYTES) continue
    const ext = path.extname(f).toLowerCase()
    if (ALLOWED_BINARY.has(ext) && ext !== '.svg') continue
    if (BINARY_EXT.has(ext)) continue
    if (CREDENTIAL.test(fs.readFileSync(path.join(dir, f), 'utf8'))) errors.push(`${f}: looks like a real credential`)
  }

  return errors
}

function main () {
  let count = 0
  for (const rel of PLUGINS) {
    const errs = checkPlugin(path.join(ROOT, rel))
    for (const e of errs) { console.error(`x ${rel}: ${e}`); count++ }
  }
  console.log(`check-plugin-bundle: ${count} problem(s)`)
  if (count > 0) process.exit(1)
}

if (require.main === module) main()

module.exports = { checkPlugin, checkLauncher, PLUGINS, MIN_README_WORDS }
