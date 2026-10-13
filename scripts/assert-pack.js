#!/usr/bin/env node
'use strict'
// Asserts that one workspace package's npm tarball contains exactly what it should (npm pack --dry-run, nothing is
// written), and that the packages in RELEASABLE are publish-ready for the npm page. Run it after building.
// Usage: node scripts/assert-pack.js <aegis|themis-core|themis-gateway|themis-plugin|themis|npm-name|all>
const fs = require('fs')
const path = require('path')
const lib = require('./lib/release-manifests')

const COMMON = [/^package\.json$/, /^README\.md$/, /^CHANGELOG\.md$/, /^LICENSE$/, /^LICENSE-APACHE$/, /^LICENSE-MIT$/, /^SECURITY\.md$/]
const FORBIDDEN = [
  /(^|\/)intel-state\.json$/, /(^|\/)health\.json$/, /(^|\/)\.intel-sync-state\.json$/, /(^|\/)\.env/, /\.tgz$/,
  /(^|\/)__tests__\//, /(^|\/)tests?\//, /\.test\.[cm]?[jt]sx?$/, /\.tsbuildinfo$/, /(^|\/)artifacts\//, /(^|\/)node_modules\//, /(^|\/)\.DS_Store$/,
  /(^|\/)src\//, /(^|\/)tsconfig[\w.-]*\.json$/, /(^|\/)jest\.config\./
]
const DIST = /^dist\/[\w@./-]+\.(c?js|d\.ts|js\.map|d\.ts\.map|json)$/
const RULES = {
  'aegis-skills': { maxUnpacked: 10e6, minFiles: 100, required: ['.claude-plugin/plugin.json', '.mcp.json', 'gemini-extension.json', 'GEMINI.md', 'server.json'], allowed: [
    /^skills\/[a-z0-9-]+\/SKILL\.md$/, /^skills\/[a-z0-9-]+\/skill\.json$/, /^skills\/[a-z0-9-]+\/references\/[A-Za-z0-9._-]+\.md$/,
    /^cli\/[\w./-]+\.c?js$/, /^lib\/[\w./-]+\.(c?js|json)$/, /^mcp\/[\w./-]+\.(c?js|json)$/,
    /^\.claude-plugin\/plugin\.json$/, /^\.mcp\.json$/, /^gemini-extension\.json$/, /^GEMINI\.md$/, /^server\.json$/] },
  '@aegis-skills/themis-core': { maxUnpacked: 5e6, minFiles: 20, required: ['dist/index.js', 'dist/index.d.ts'], allowed: [DIST] },
  '@aegis-skills/themis-gateway': { maxUnpacked: 5e6, minFiles: 5, required: ['dist/index.js', 'dist/index.d.ts'], allowed: [DIST] },
  '@aegis-skills/themis-plugin': { maxUnpacked: 5e6, minFiles: 10, required: ['.claude-plugin/plugin.json', '.mcp.json', 'server.json'], allowed: [
    DIST, /^agents\/[\w./-]+\.md$/, /^skills\/[\w./-]+\.(md|json)$/,
    /^\.claude-plugin\/plugin\.json$/, /^\.mcp\.json$/, /^gemini-extension\.json$/, /^GEMINI\.md$/, /^server\.json$/] },
  '@aegis-skills/themis': { maxUnpacked: 40e6, minFiles: 20, required: ['bin/themis.js', 'dist/ui/index.html'], allowed: [/^bin\/[\w.-]+\.js$/, DIST, /^dist\/ui\/[\w@./-]+$/] }
}

function entryPoints (pj) {
  const out = []
  const add = v => { if (typeof v === 'string') out.push(path.posix.normalize(v.replace(/^\.\//, ''))) }
  add(pj.main); add(pj.types); add(pj.typings)
  if (typeof pj.bin === 'string') add(pj.bin); else Object.values(pj.bin || {}).forEach(add)
  return out
}

// Extra checks for the packages that are published to npm in this phase (amendment 2, point 5).
function releaseReadiness (pkg, pj, rules, readmeText) {
  const p = []
  const need = (ok, msg) => { if (!ok) p.push(`not publish-ready: ${msg}`) }
  need(typeof pj.description === 'string' && pj.description.length >= 20, 'package.json "description" is missing or too short')
  need(typeof pj.homepage === 'string' && /^https:\/\//.test(pj.homepage), 'package.json "homepage" must be an https URL')
  need(pj.bugs && /^https:\/\//.test(pj.bugs.url || ''), 'package.json "bugs.url" must be an https URL')
  need(Array.isArray(pj.keywords) && pj.keywords.length >= 3 && pj.keywords.every(k => typeof k === 'string' && k), 'package.json needs at least 3 "keywords"')
  need(Array.isArray(pj.files) && pj.files.length > 0, 'package.json needs a "files" allow-list')
  need(pj.engines && pj.engines.node === lib.ENGINES_NODE, `package.json "engines.node" must be "${lib.ENGINES_NODE}"`)
  need(pj.license === lib.LICENSE, `package.json "license" must be "${lib.LICENSE}"`)
  need(pj.publishConfig && pj.publishConfig.access === 'public', 'package.json "publishConfig.access" must be "public"')
  if (pkg.name.startsWith('@')) need(pj.publishConfig && pj.publishConfig.provenance === true, 'scoped package: "publishConfig.provenance" must be true')
  need(pj.repository && pj.repository.directory === pkg.dir, `package.json "repository.directory" must be "${pkg.dir}"`)
  need(!pj.private, 'package.json must not be "private"')
  need(!pj.scripts || !Object.keys(pj.scripts).some(k => /^(preinstall|install|postinstall)$/.test(k)), 'install-time lifecycle scripts are not allowed')
  need((readmeText.match(/\S+/g) || []).length >= 80, 'README.md has fewer than 80 words')
  need(/licen[cs]e/i.test(readmeText), 'README.md has no licence section')
  if (pkg.name !== 'aegis-skills') {
    need(/pre-1\.0/i.test(readmeText) && /(in development|not released)/i.test(readmeText), 'README.md must say the package is pre-1.0 and that Themis is in development')
  }
  return p
}

function assertOne (pkg) {
  const rules = RULES[pkg.name]
  const pj = lib.readJson(`${pkg.dir}/package.json`).data
  const { files, unpackedSize } = lib.packFiles(pkg.dir)
  const have = new Set(files)
  const problems = []
  for (const f of files) {
    if (FORBIDDEN.some(r => r.test(f))) problems.push(`forbidden file in tarball: ${f}`)
    else if (![...COMMON, ...rules.allowed].some(r => r.test(f))) problems.push(`unexpected file in tarball: ${f}`)
  }
  for (const f of ['package.json', 'README.md', 'LICENSE', 'LICENSE-APACHE', 'LICENSE-MIT', ...rules.required, ...entryPoints(pj)]) {
    if (!have.has(f)) problems.push(`required file missing from tarball: ${f}`)
  }
  if (files.length < rules.minFiles) problems.push(`only ${files.length} files in the tarball (expected at least ${rules.minFiles}); was the package built?`)
  if (pkg.name === 'aegis-skills') {
    const skillsDir = lib.abs(`${pkg.dir}/skills`)
    const skills = fs.readdirSync(skillsDir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name)
    if (!skills.length) problems.push('no skills found in packages/aegis/skills')
    for (const s of skills) {
      for (const f of ['SKILL.md', 'skill.json']) if (!have.has(`skills/${s}/${f}`)) problems.push(`skill file missing from tarball: skills/${s}/${f}`)
      const refDir = path.join(skillsDir, s, 'references')
      if (!fs.existsSync(refDir)) continue
      for (const r of fs.readdirSync(refDir)) {
        if (r.endsWith('.md') && !have.has(`skills/${s}/references/${r}`)) problems.push(`reference missing from tarball: skills/${s}/references/${r}`)
      }
    }
  }
  if (unpackedSize > rules.maxUnpacked) problems.push(`unpacked size ${unpackedSize} exceeds ${rules.maxUnpacked}`)
  if (pkg.releasable) {
    const readme = lib.exists(`${pkg.dir}/README.md`) ? fs.readFileSync(lib.abs(`${pkg.dir}/README.md`), 'utf8') : ''
    problems.push(...releaseReadiness(pkg, pj, rules, readme))
  }
  return { problems, files: files.length, unpackedSize, version: pj.version }
}

function main () {
  const arg = process.argv[2] || ''
  const targets = arg === 'all' ? lib.presentPackages() : [lib.findPackage(arg)]
  if (!targets.length || targets.some(t => !t)) { console.error('usage: node scripts/assert-pack.js <aegis|themis-core|themis-gateway|themis-plugin|themis|npm-name|all>'); process.exit(2) }
  let bad = 0
  for (const pkg of targets) {
    const r = assertOne(pkg)
    if (r.problems.length) {
      bad++
      console.error(`assert-pack: ${pkg.name} - ${r.problems.length} problem(s)`)
      r.problems.forEach(p => console.error(`  - ${p}`))
    } else {
      console.log(`assert-pack: OK ${pkg.name}@${r.version} - ${r.files} files, ${r.unpackedSize} bytes unpacked${pkg.releasable ? ', publish-ready' : ', not releasable yet'}`)
    }
  }
  if (bad) process.exit(1)
}

if (require.main === module) main()

module.exports = { assertOne, releaseReadiness, RULES }
