'use strict'
// Single source of truth for which files embed which package version, and which packages may be released.
// Used by bump-version.js, check-versions.js, assert-pack.js and pack-to.js.
// Node built-ins only. AEGIS_RELEASE_ROOT overrides the repo root (tests use fixtures).
const fs = require('fs')
const path = require('path')

const ROOT = process.env.AEGIS_RELEASE_ROOT
  ? path.resolve(process.env.AEGIS_RELEASE_ROOT)
  : path.resolve(__dirname, '..', '..')
const LICENSE = '(Apache-2.0 OR MIT)'
const ENGINES_NODE = '>=24'
const REPO_URL = 'https://github.com/drupadsachania/aegis-skills'
const HOMEPAGE = 'https://aegis-skills.vercel.app'
const DEP_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']

// The ONLY packages that may be published to npm right now (Phase 7 scope, owner decision 2026-10-13).
// `@aegis-skills/themis-plugin` and `@aegis-skills/themis` are built, tested and version-checked but not released
// until Phase 8. Widen this list there. release.yml, the marketplace guard and assert-pack all read it.
const RELEASABLE = ['aegis-skills', '@aegis-skills/themis-core', '@aegis-skills/themis-gateway']

// kind 'version': top-level "version". kind 'server': MCP Registry server.json (top-level + npm packages[] entry).
// kind 'marketplace': the plugins[] entry whose name is `plugin`. optional: the file or entry may be absent.
const PACKAGES = [
  { key: 'aegis', name: 'aegis-skills', dir: 'packages/aegis', manifests: [
    { file: 'packages/aegis/.claude-plugin/plugin.json', kind: 'version' },
    { file: 'packages/aegis/gemini-extension.json', kind: 'version' },
    { file: 'packages/aegis/server.json', kind: 'server' },
    { file: '.claude-plugin/marketplace.json', kind: 'marketplace', plugin: 'aegis' },
    { file: 'listings/chatgpt/plugin.json', kind: 'version', optional: true }
  ] },
  { key: 'themis-core', name: '@aegis-skills/themis-core', dir: 'packages/themis-core', manifests: [] },
  { key: 'themis-gateway', name: '@aegis-skills/themis-gateway', dir: 'packages/themis-gateway', manifests: [] },
  { key: 'themis-plugin', name: '@aegis-skills/themis-plugin', dir: 'packages/themis-plugin', manifests: [
    { file: 'packages/themis-plugin/.claude-plugin/plugin.json', kind: 'version' },
    { file: 'packages/themis-plugin/gemini-extension.json', kind: 'version', optional: true },
    { file: 'packages/themis-plugin/server.json', kind: 'server', optional: true },
    // Not listed while the plugin is outside RELEASABLE; the entry returns in Phase 8.
    { file: '.claude-plugin/marketplace.json', kind: 'marketplace', plugin: 'themis', optional: true }
  ] },
  { key: 'themis', name: '@aegis-skills/themis', dir: 'packages/themis-app', manifests: [] }
]
for (const p of PACKAGES) p.releasable = RELEASABLE.includes(p.name)

// Never published, but their package.json may depend on the packages above (exact X.Y.Z or ^X.Y.Z).
const DEPENDENT_ONLY_DIRS = ['apps/web']
// Directory-submitted manifests that launch our packages through npx. Every `<npm-name>@<spec>` in them must be an
// exact X.Y.Z equal to the workspace version (D16, cross-phase finding 6.1).
const PIN_FILES = [
  'packages/aegis/.mcp.json', 'packages/aegis/gemini-extension.json',
  'packages/themis-plugin/.mcp.json', 'packages/themis-plugin/gemini-extension.json'
]
// Maintainer docs that quote the current pins. Same exactness rule for packages in this repo; unknown names are ignored.
const DOC_PIN_FILES = [
  'docs/themis/versions.md', 'docs/listings/README.md', 'docs/listings/anthropic-plugin.md',
  'docs/listings/gemini-gallery.md', 'docs/listings/mcp-registry.md'
]
// Markdown tables with rows like: | `npm-name` | 1.2.3 ... |  (checked and rewritten by bump-version).
const DOC_TABLE_FILES = ['docs/themis/versions.md']
const TABLE_ROW_RE = /^(\|\s*`)(aegis-skills|@aegis-skills\/[a-z-]+)(`\s*\|\s*)(\d+\.\d+\.\d+)/gm
// Groups: 1 npm name, 2 caret, 3 major, 4 minor, 5 patch. The lookbehind stops "aegis-skills" matching inside "@aegis-skills/x".
const PIN_RE = /(?<![\w@/-])(aegis-skills|@aegis-skills\/[a-z-]+)@(\^?)(\d+)(?:\.(\d+)\.(\d+))?(?![\w.-])/g

const abs = rel => path.join(ROOT, rel)
const exists = rel => fs.existsSync(abs(rel))
function readJson (rel) { const text = fs.readFileSync(abs(rel), 'utf8'); return { text, data: JSON.parse(text) } }
function writeJson (rel, data, originalText = '') {
  const m = /\n([ \t]+)"/.exec(originalText)
  const nl = originalText === '' || /\n$/.test(originalText) ? '\n' : ''
  fs.writeFileSync(abs(rel), JSON.stringify(data, null, m ? m[1] : 2) + nl)
}

// ---- surgical JSON string edits: keep the file's own formatting (inline arrays, CRLF, indentation) ----
// Returns Map<JSON.stringify(path), {start, end}> for every string VALUE in the document.
function scanStrings (text) {
  const out = new Map()
  let i = 0
  const ws = () => { while (i < text.length && /\s/.test(text[i])) i++ }
  const str = () => {
    const start = i
    i++
    while (text[i] !== '"') { if (text[i] === '\\') i++; i++ }
    i++
    return { start, end: i }
  }
  const value = p => {
    ws()
    const c = text[i]
    if (c === '"') { const r = str(); out.set(JSON.stringify(p), r); return }
    if (c === '{') {
      i++; ws()
      if (text[i] === '}') { i++; return }
      for (;;) {
        ws()
        const k = str()
        const key = JSON.parse(text.slice(k.start, k.end))
        ws(); i++ // ':'
        value([...p, key])
        ws()
        if (text[i] === ',') { i++; continue }
        i++; return
      }
    }
    if (c === '[') {
      i++; ws()
      if (text[i] === ']') { i++; return }
      for (let n = 0; ; n++) {
        value([...p, n])
        ws()
        if (text[i] === ',') { i++; continue }
        i++; return
      }
    }
    while (i < text.length && !/[,}\]\s]/.test(text[i])) i++
  }
  value([])
  return out
}
// edits: [{ path: [...keys], value: string }]. Throws when a path is not an existing string value.
function setStrings (text, edits) {
  const map = scanStrings(text)
  const spans = edits.map(e => {
    const s = map.get(JSON.stringify(e.path))
    if (!s) throw new Error(`no string value at ${JSON.stringify(e.path)}`)
    return { ...s, raw: JSON.stringify(e.value) }
  }).sort((a, b) => b.start - a.start)
  let out = text
  for (const s of spans) out = out.slice(0, s.start) + s.raw + out.slice(s.end)
  return out
}

function parse (v) { const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(v)); return m ? m.slice(1).map(Number) : null }
function cmp (a, b) { for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0 }
function satisfiesCaret (base, version) {
  const b = parse(base), v = parse(version)
  if (!b || !v || cmp(v, b) < 0) return false
  if (b[0] > 0) return v[0] === b[0]
  if (b[1] > 0) return v[0] === 0 && v[1] === b[1]
  return cmp(v, b) === 0
}
function nextVersion (current, spec) {
  const c = parse(current)
  if (!c) throw new Error(`current version "${current}" is not X.Y.Z`)
  if (spec === 'major') return `${c[0] + 1}.0.0`
  if (spec === 'minor') return `${c[0]}.${c[1] + 1}.0`
  if (spec === 'patch') return `${c[0]}.${c[1]}.${c[2] + 1}`
  const e = parse(spec)
  if (!e) throw new Error(`"${spec}" is not patch, minor, major or X.Y.Z (prereleases are not used)`)
  if (cmp(e, c) <= 0) throw new Error(`${spec} is not greater than ${current}`)
  return spec
}

const findPackage = q => PACKAGES.find(p => p.key === q || p.name === q) || null
const isInternal = name => PACKAGES.some(p => p.name === name)
const isReleasable = name => RELEASABLE.includes(name)
const presentPackages = () => PACKAGES.filter(p => exists(`${p.dir}/package.json`))
const dependentDirs = () => [...PACKAGES.map(p => p.dir), ...DEPENDENT_ONLY_DIRS].filter(d => exists(`${d}/package.json`))

// A manifest's version slots: [{ label, path, value }] or { label, missing: true }. Empty when an optional entry is absent.
function slots (pkg, m, data) {
  if (m.kind === 'version') return [{ label: 'version', path: ['version'], value: data.version }]
  if (m.kind === 'server') {
    const out = [{ label: 'version', path: ['version'], value: data.version }]
    ;(data.packages || []).forEach((p, i) => {
      if (p.registryType === 'npm' && p.identifier === pkg.name) out.push({ label: `packages[${i}].version`, path: ['packages', i, 'version'], value: p.version })
    })
    if (out.length === 1) out.push({ label: `packages[] npm entry for ${pkg.name}`, missing: true })
    return out
  }
  if (m.kind === 'marketplace') {
    const i = (data.plugins || []).findIndex(p => p.name === m.plugin)
    if (i === -1) return m.optional ? [] : [{ label: `plugins[name=${m.plugin}]`, missing: true }]
    return [{ label: `plugins[name=${m.plugin}].version`, path: ['plugins', i, 'version'], value: data.plugins[i].version }]
  }
  throw new Error(`unknown manifest kind ${m.kind}`)
}

const findPins = text => [...String(text).matchAll(PIN_RE)]
// versions: { [npmName]: 'X.Y.Z' } of the packages present in the repo. lenient: ignore names that are not in this repo.
function pinProblem (match, versions, { lenient = false } = {}) {
  const [whole, name, caret, major, minor, patch] = match
  if (!(name in versions)) return lenient ? null : `${whole} pins ${name}, which is not a package in this repo`
  if (caret || minor === undefined) return `${whole} must be an exact pin: ${name}@${versions[name]}`
  const spec = `${major}.${minor}.${patch}`
  return spec === versions[name] ? null : `${whole} must equal ${name}@${versions[name]}`
}
// Rewrites every pin of `name` (any form) to the exact `version`; other packages' pins are untouched.
function rewritePins (text, name, version) {
  return String(text).replace(PIN_RE, (whole, n) => (n === name ? `${name}@${version}` : whole))
}
const tableRows = text => [...String(text).matchAll(TABLE_ROW_RE)].map(m => ({ name: m[2], version: m[4] }))
function rewriteTable (text, name, version) {
  return String(text).replace(TABLE_ROW_RE, (whole, a, n, b, v) => (n === name ? `${a}${n}${b}${version}` : whole))
}

// ---- dependency ranges between packages in this repo ----
// Accepted forms: ^X.Y.Z (packages, D4) or exact X.Y.Z (the website, which deploys against one exact Aegis).
function rangeProblem (range, version) {
  const caret = /^\^(\d+\.\d+\.\d+)$/.exec(range)
  if (caret) return satisfiesCaret(caret[1], version) ? null : `"${range}" does not accept the workspace version ${version}`
  if (/^\d+\.\d+\.\d+$/.test(range)) return range === version ? null : `"${range}" must equal the workspace version ${version}`
  return `"${range}" must have the form ^X.Y.Z or X.Y.Z`
}
// The range to write after a bump, or null to leave the existing one alone (D4).
function rangeAfterBump (range, next) {
  if (/^\d+\.\d+\.\d+$/.test(range)) return next
  const base = /^\^(\d+\.\d+\.\d+)$/.exec(range)
  if (base && satisfiesCaret(base[1], next)) return null
  return `^${next}`
}

// ---- marketplace guard (amendment 2, point 4) ----
// Every plugin listed in .claude-plugin/marketplace.json must ship an npm package that is in RELEASABLE, and may only
// launch RELEASABLE packages. Otherwise the marketplace would offer an install that cannot work.
function marketplaceProblems () {
  const problems = []
  const file = '.claude-plugin/marketplace.json'
  if (!exists(file)) return problems
  const plugins = readJson(file).data.plugins || []
  const OURS = /^(aegis-skills|@aegis-skills\/[a-z-]+)(@\S*)?$/
  const strings = (v, out = []) => {
    if (typeof v === 'string') out.push(v)
    else if (Array.isArray(v)) v.forEach(x => strings(x, out))
    else if (v && typeof v === 'object') Object.values(v).forEach(x => strings(x, out))
    return out
  }
  for (const pl of plugins) {
    const dir = String(pl.source || '').replace(/^\.\//, '')
    if (!dir || !exists(`${dir}/package.json`)) { problems.push(`${file}: plugin "${pl.name}" has no package.json at ${pl.source}`); continue }
    const own = readJson(`${dir}/package.json`).data.name
    if (OURS.test(own) && !isReleasable(own)) problems.push(`${file}: plugin "${pl.name}" ships ${own}, which is not releasable yet (RELEASABLE: ${RELEASABLE.join(', ')})`)
    const launched = new Set()
    for (const f of ['.mcp.json', 'gemini-extension.json', '.claude-plugin/plugin.json']) {
      if (!exists(`${dir}/${f}`)) continue
      for (const s of strings(readJson(`${dir}/${f}`).data)) { if (OURS.test(s)) launched.add(s.replace(/(?<=.)@\S*$/, '')) }
    }
    if (exists(`${dir}/server.json`)) {
      for (const p of readJson(`${dir}/server.json`).data.packages || []) { if (p.registryType === 'npm') launched.add(p.identifier) }
    }
    for (const n of launched) {
      if (!isReleasable(n)) problems.push(`${file}: plugin "${pl.name}" launches ${n}, which is not releasable yet (RELEASABLE: ${RELEASABLE.join(', ')})`)
    }
  }
  return problems
}

// Files npm would publish for one workspace package (no lifecycle scripts run).
function packFiles (dir, { ignoreScripts = true } = {}) {
  const { execSync } = require('child_process')
  const out = execSync(`npm pack --dry-run --json${ignoreScripts ? ' --ignore-scripts' : ''} --workspace "${dir}"`,
    { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 })
  const start = out.search(/^\[\s*\{/m)
  if (start === -1) throw new Error(`npm pack printed no JSON for ${dir}`)
  const info = JSON.parse(out.slice(start))[0]
  return { files: info.files.map(f => f.path.replace(/\\/g, '/')).sort(), unpackedSize: info.unpackedSize, filename: info.filename }
}

module.exports = {
  ROOT, LICENSE, ENGINES_NODE, REPO_URL, HOMEPAGE, DEP_FIELDS, RELEASABLE, PACKAGES, DEPENDENT_ONLY_DIRS, PIN_FILES, DOC_PIN_FILES, DOC_TABLE_FILES,
  abs, exists, readJson, writeJson, scanStrings, setStrings, parse, cmp, satisfiesCaret, nextVersion,
  findPackage, isInternal, isReleasable, presentPackages, dependentDirs, slots, findPins, pinProblem, rewritePins, tableRows, rewriteTable,
  rangeProblem, rangeAfterBump, marketplaceProblems, packFiles
}
