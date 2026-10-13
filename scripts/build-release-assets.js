#!/usr/bin/env node
'use strict'
// Builds the GitHub Release assets for one releasable package into an empty --out directory (default dist-release/assets).
//   aegis:   aegis-skill-<skill>-<version>.zip   one per skill, byte-identical to the website's /downloads/skills/<skill>.zip
//            aegis-prompts-<version>.zip         the flattened single-file prompts, byte-identical members of the site's
//            {darwin,linux,win32}.<ext-name>.zip Gemini extension archives (manifest at the archive root, skills/, GEMINI.md,
//                                                README and licences; self-contained apart from the pinned npx MCP server)
//            aegis-chatgpt-plugin-<version>.zip  skills-only ChatGPT plugin (scripts/build-chatgpt-bundle.js)
//   others:  the npm tarball only.
//   all:     the npm tarball (when --npm-tarball is given) and SHA256SUMS.
// The skill zips and prompts come from apps/web/scripts/build-downloads.js (the site's own generator); it is run here
// when apps/web/public/downloads is missing or stale. Every ZIP is read back and validated before SHA256SUMS is written.
// Usage: node scripts/build-release-assets.js --package <key|npm-name> [--out <dir>] [--npm-tarball <file>]
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { execFileSync } = require('child_process')
const lib = require('./lib/release-manifests')
const { createZip } = require('./lib/zip')
const { readZip } = require('./lib/zip-read')
const { commonProblems, geminiProblems } = require('./lib/release-validate')
const { buildChatgptBundle } = require('./build-chatgpt-bundle')

const DOWNLOADS = 'apps/web/public/downloads'
const sha256 = buf => crypto.createHash('sha256').update(buf).digest('hex')

function ensureDownloads (version) {
  const fresh = () => {
    if (!lib.exists(`${DOWNLOADS}/index.json`)) return false
    return lib.readJson(`${DOWNLOADS}/index.json`).data.aegisVersion === version
  }
  if (!fresh()) execFileSync(process.execPath, [path.join(lib.ROOT, 'apps/web/scripts/build-downloads.js')], { cwd: lib.ROOT, stdio: 'inherit' })
  if (!fresh()) throw new Error(`${DOWNLOADS} was not built for aegis ${version}`)
  return lib.readJson(`${DOWNLOADS}/index.json`).data
}

function geminiEntries (dir) {
  const files = lib.packFiles(dir).files
  const keep = f => /^(gemini-extension\.json|GEMINI\.md|README\.md|LICENSE(-APACHE|-MIT)?)$/.test(f) ||
    /^skills\/[a-z0-9-]+\/(SKILL\.md|references\/[A-Za-z0-9._-]+\.md)$/.test(f)
  const picked = files.filter(keep)
  for (const f of ['gemini-extension.json', 'GEMINI.md', 'README.md', 'LICENSE']) {
    if (!picked.includes(f)) throw new Error(`${f} is not in the npm file list of ${dir}`)
  }
  return picked.map(f => ({ name: f, data: fs.readFileSync(lib.abs(`${dir}/${f}`)) }))
}

function aegisAssets (out) {
  const dir = 'packages/aegis'
  const version = lib.readJson(`${dir}/package.json`).data.version
  const index = ensureDownloads(version)
  const onDisk = fs.readdirSync(lib.abs(`${dir}/skills`), { withFileTypes: true }).filter(e => e.isDirectory()).length
  if (index.skills.length !== onDisk) throw new Error(`index.json lists ${index.skills.length} skills, ${dir}/skills has ${onDisk}`)

  const prompts = []
  for (const s of index.skills) {
    const zip = fs.readFileSync(lib.abs(`${DOWNLOADS}/skills/${s.name}.zip`))
    if (sha256(zip) !== s.zipSha256) throw new Error(`skills/${s.name}.zip does not match its index.json sha256`)
    fs.writeFileSync(path.join(out, `aegis-skill-${s.name}-${version}.zip`), zip)
    prompts.push({ name: `${s.name}.md`, data: fs.readFileSync(lib.abs(`${DOWNLOADS}/prompts/${s.name}.md`)) })
  }
  fs.writeFileSync(path.join(out, `aegis-prompts-${version}.zip`), createZip(prompts))

  const gem = lib.readJson(`${dir}/gemini-extension.json`).data
  if (!/^[a-z0-9-]+$/.test(gem.name || '')) throw new Error('gemini-extension.json "name" must use lowercase letters, digits and hyphens')
  const archive = createZip(geminiEntries(dir))
  const gp = geminiProblems(readZip(archive), version, { name: gem.name })
  if (gp.length) throw new Error(`Gemini archive invalid:\n  - ${gp.join('\n  - ')}`)
  for (const platform of ['darwin', 'linux', 'win32']) fs.writeFileSync(path.join(out, `${platform}.${gem.name}.zip`), archive)

  const chatgpt = buildChatgptBundle(out)
  return `${index.skills.length} skill zips, 1 prompts bundle, 3 Gemini archives, ${chatgpt ? '1 ChatGPT plugin bundle' : 'no ChatGPT bundle (listings/chatgpt not present)'}`
}

// Re-opens every .zip in dir: CRC, safe ASCII names, no secrets. Returns problems.
function verifyZips (dir) {
  const problems = []
  for (const f of fs.readdirSync(dir).filter(n => n.endsWith('.zip'))) {
    try {
      for (const p of commonProblems(readZip(fs.readFileSync(path.join(dir, f))))) problems.push(`${f}: ${p}`)
    } catch (e) { problems.push(`${f}: ${e.message}`) }
  }
  return problems
}

function buildAssets ({ pkg, out, npmTarball }) {
  if (!pkg.releasable) throw new Error(`${pkg.name} is not releasable yet (RELEASABLE: ${lib.RELEASABLE.join(', ')})`)
  if (fs.existsSync(out) && fs.readdirSync(out).length) throw new Error(`${out} is not empty; delete it first`)
  fs.mkdirSync(out, { recursive: true })
  const summary = pkg.key === 'aegis' ? aegisAssets(out) : 'npm tarball only'
  if (npmTarball) {
    if (!/\.tgz$/.test(npmTarball)) throw new Error(`--npm-tarball must be a .tgz, got ${npmTarball}`)
    fs.copyFileSync(path.resolve(npmTarball), path.join(out, path.basename(npmTarball)))
  }
  const problems = verifyZips(out)
  if (problems.length) throw new Error(`release assets invalid:\n  - ${problems.join('\n  - ')}`)
  const names = fs.readdirSync(out).sort()
  fs.writeFileSync(path.join(out, 'SHA256SUMS'), names.map(f => `${sha256(fs.readFileSync(path.join(out, f)))}  ${f}`).join('\n') + '\n')
  return { summary, names: [...names, 'SHA256SUMS'] }
}

if (require.main === module) {
  const arg = name => { const i = process.argv.indexOf(name); return i === -1 ? null : process.argv[i + 1] }
  const pkg = lib.findPackage(arg('--package') || '')
  const outArg = arg('--out') || 'dist-release/assets'
  if (!pkg) { console.error('usage: node scripts/build-release-assets.js --package <key|npm-name> [--out <dir>] [--npm-tarball <file>]'); process.exit(2) }
  try {
    const { summary, names } = buildAssets({ pkg, out: path.resolve(outArg), npmTarball: arg('--npm-tarball') })
    console.log(`build-release-assets: ${summary}`)
    console.log(`build-release-assets: ${names.length} file(s) incl. SHA256SUMS in ${outArg}`)
  } catch (e) { console.error(`build-release-assets: ${e.message}`); process.exit(1) }
}

module.exports = { buildAssets, verifyZips, geminiEntries }
