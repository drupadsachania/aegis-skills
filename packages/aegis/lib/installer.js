'use strict'

/**
 * Aegis installer. Copies the skill pack into each platform's native skills
 * folder, registers the MCP server in the platform's own config, and records
 * every file it wrote (sha256) in the ledger so that refresh and uninstall
 * only ever touch Aegis files.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')
const { TARGETS, PLATFORM_IDS, SERVER_NAME, mcpEntry } = require('./targets')
const writers = require('./config-writers')
const ledger = require('./ledger')
const PKG = require('../package.json')

const PACK_SKILLS = path.join(__dirname, '..', 'skills')

const sha = buf => crypto.createHash('sha256').update(buf).digest('hex')
const abs = (root, rel) => path.join(root, ...rel.split('/'))
const skillOf = rel => rel.split('/')[0]
const skillCount = files => new Set(Object.keys(files || {}).map(skillOf)).size
const defaultLog = m => process.stdout.write(m + '\n')

function usageError (msg) {
  const e = new Error(msg)
  e.code = 'AEGIS_USAGE'
  return e
}

// The only files that ever ship to a platform: SKILL.md, skill.json, references/*.md.
function packFiles () {
  const out = []
  for (const name of fs.readdirSync(PACK_SKILLS).sort()) {
    const dir = path.join(PACK_SKILLS, name)
    if (!fs.existsSync(path.join(dir, 'SKILL.md'))) continue
    out.push(`${name}/SKILL.md`)
    if (fs.existsSync(path.join(dir, 'skill.json'))) out.push(`${name}/skill.json`)
    const refs = path.join(dir, 'references')
    if (fs.existsSync(refs)) {
      for (const f of fs.readdirSync(refs).sort()) if (f.endsWith('.md')) out.push(`${name}/references/${f}`)
    }
  }
  return out
}

function removeOwned (skillsDir, rel, hash, log) {
  const file = abs(skillsDir, rel)
  if (!fs.existsSync(file)) return
  if (sha(fs.readFileSync(file)) === hash) fs.unlinkSync(file)
  else { fs.renameSync(file, file + '.bak'); log(`  kept your edited copy: ${file}.bak`) }
  for (let d = path.dirname(file); d.startsWith(skillsDir + path.sep); d = path.dirname(d)) {
    try { fs.rmdirSync(d) } catch { break } // stops at the first non-empty folder
  }
}

// Make skillsDir match the pack. `owned` maps rel path -> sha256 recorded earlier.
function syncFiles (skillsDir, owned, { force = false, log = defaultLog } = {}) {
  const wanted = packFiles()
  const skip = new Set()
  for (const name of new Set(wanted.map(skillOf))) {
    const ours = Object.keys(owned).some(r => skillOf(r) === name)
    if (!ours && !force && fs.existsSync(path.join(skillsDir, name))) {
      skip.add(name)
      log(`  ! skipped ${name}: ${path.join(skillsDir, name)} was not installed by aegis (re-run with --force to back it up and replace it)`)
    }
  }
  const next = {}
  for (const rel of wanted) {
    if (skip.has(skillOf(rel))) continue
    const buf = fs.readFileSync(abs(PACK_SKILLS, rel))
    const h = sha(buf)
    const dst = abs(skillsDir, rel)
    if (fs.existsSync(dst)) {
      const cur = sha(fs.readFileSync(dst))
      if (cur === h) { next[rel] = h; continue }
      if (owned[rel] !== cur) { fs.copyFileSync(dst, dst + '.bak'); log(`  saved your edits: ${dst}.bak`) }
    }
    fs.mkdirSync(path.dirname(dst), { recursive: true })
    fs.writeFileSync(dst, buf)
    next[rel] = h
  }
  const wantedSet = new Set(wanted)
  for (const [rel, h] of Object.entries(owned)) {
    if (!(rel in next) && !wantedSet.has(rel)) removeOwned(skillsDir, rel, h, log)
  }
  return next
}

function resolveTarget (platform, { project = false, dir = process.cwd() } = {}) {
  const t = TARGETS[platform]
  if (!t) throw usageError(`unknown platform "${platform}". Use one of: ${PLATFORM_IDS.join(', ')}`)
  const scope = project ? 'project' : 'user'
  const base = project ? path.resolve(dir) : os.homedir()
  const spec = t.mcp[scope]
  return { platform, label: t.label, scope, projectDir: project ? base : null, skillsDir: t.skills[scope](base), spec, mcpFile: spec.file ? spec.file(base) : null }
}

function registerMcp (tg, mode, log) {
  const entry = tg.spec.entry(mcpEntry(mode))
  if (!tg.mcpFile) { log(`  MCP: register it yourself: ${tg.spec.manual(entry)}`); return null }
  try {
    const changed = tg.spec.format === 'toml'
      ? writers.upsertTomlServer(tg.mcpFile, SERVER_NAME, entry)
      : writers.upsertJsonServer(tg.mcpFile, tg.spec.key, SERVER_NAME, entry)
    log(`  MCP: ${changed ? 'registered' : 'already registered'} "${SERVER_NAME}" in ${tg.mcpFile}`)
    return { file: tg.mcpFile, format: tg.spec.format, key: tg.spec.key }
  } catch (e) {
    if (e.code !== 'AEGIS_UNPARSEABLE') throw e
    log(`  ! ${e.message}`)
    return null
  }
}

function unregisterMcp (mcp, log) {
  try {
    const changed = mcp.format === 'toml'
      ? writers.removeTomlServer(mcp.file, SERVER_NAME)
      : writers.removeJsonServer(mcp.file, mcp.key, SERVER_NAME)
    if (changed) log(`  MCP: removed "${SERVER_NAME}" from ${mcp.file}`)
  } catch (e) {
    if (e.code !== 'AEGIS_UNPARSEABLE') throw e
    log(`  ! ${e.message}`)
  }
}

function install (platforms, opts = {}) {
  const log = opts.log || defaultLog
  const l = ledger.load()
  for (const p of platforms) {
    const tg = resolveTarget(p, opts)
    const prev = ledger.find(l, tg)
    const files = syncFiles(tg.skillsDir, ledger.filesFor(l, tg.skillsDir), { force: opts.force, log })
    const mcp = opts.mcp === false ? (prev ? prev.mcp : null) : registerMcp(tg, opts.mcpMode || 'npx', log)
    ledger.upsert(l, { platform: p, scope: tg.scope, projectDir: tg.projectDir, skillsDir: tg.skillsDir, mcp, version: PKG.version, installedAt: new Date().toISOString(), files })
    log(`✓ ${tg.label} (${tg.scope}): ${skillCount(files)} skills in ${tg.skillsDir}`)
  }
  ledger.save(l)
}

function uninstall (platforms, opts = {}) {
  const log = opts.log || defaultLog
  const l = ledger.load()
  const scope = opts.project ? 'project' : 'user'
  const projectDir = opts.project ? path.resolve(opts.dir || process.cwd()) : null
  const doomed = l.installs.filter(e => e.scope === scope && e.projectDir === projectDir && (!platforms || platforms.includes(e.platform)))
  if (!doomed.length) { log('Nothing recorded for that platform and scope.'); return }
  const keep = l.installs.filter(e => !doomed.includes(e))
  for (const e of doomed) {
    const shared = keep.some(k => path.resolve(k.skillsDir) === path.resolve(e.skillsDir))
    if (!shared) for (const [rel, h] of Object.entries(e.files || {})) removeOwned(e.skillsDir, rel, h, log)
    if (e.mcp && !keep.some(k => k.mcp && path.resolve(k.mcp.file) === path.resolve(e.mcp.file))) unregisterMcp(e.mcp, log)
    log(`✓ removed ${e.platform} (${e.scope})${shared ? ': skills kept, another platform uses the same folder' : ''}`)
  }
  l.installs = keep
  ledger.save(l)
}

function resync (l, e, log) {
  e.files = syncFiles(e.skillsDir, ledger.filesFor(l, e.skillsDir), { log })
  e.version = PKG.version
}

function update (opts = {}) {
  const log = opts.log || defaultLog
  const l = ledger.load()
  if (!l.installs.length) { log('No installs recorded. Run: aegis install --platform <id>'); return }
  for (const e of l.installs) { resync(l, e, log); log(`✓ updated ${e.platform} (${e.scope}) in ${e.skillsDir}`) }
  ledger.save(l)
}

function refreshIfStale (log) {
  if (process.env.AEGIS_NO_AUTO_REFRESH === '1') return 0
  const l = ledger.load()
  const stale = l.installs.filter(e => e.version !== PKG.version)
  if (!stale.length) return 0
  for (const e of stale) resync(l, e, log)
  ledger.save(l)
  log(`aegis: refreshed ${stale.length} install(s) to ${PKG.version}`)
  return stale.length
}

function detectPlatforms () {
  const home = os.homedir()
  return PLATFORM_IDS.filter(id => TARGETS[id].detect(home).some(p => fs.existsSync(p)))
}

function listing () {
  const l = ledger.load()
  return {
    version: PKG.version,
    bundled: [...new Set(packFiles().map(skillOf))],
    installs: l.installs.map(({ files, ...rest }) => ({ ...rest, skills: skillCount(files) }))
  }
}

module.exports = { install, uninstall, update, refreshIfStale, detectPlatforms, listing, resolveTarget, packFiles, syncFiles }
