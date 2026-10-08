'use strict'

/**
 * Aegis skill reader (osk 1.1).
 *
 * Phases are resolved from skill.json (`file`). Everything returned by
 * listSkills/getSkillManifest is path-free, because it is served over HTTP and
 * MCP; only getPhaseRef exposes a ref, for in-process callers. All lookups
 * validate names and keep file access inside the skill's own folder.
 */

const fs = require('fs')
const fsp = fs.promises
const path = require('path')
const { PHASE_FILE } = require('../lib/skill-meta')

// Letters, digits, dot, underscore, hyphen; 1-64 chars. Blocks traversal shapes.
const SAFE_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/
let cachedDir = null

function isDir (p) {
  try { return fs.statSync(p).isDirectory() } catch { return false }
}

function getSkillsDir () {
  if (process.env.AEGIS_SKILLS_DIR) return path.resolve(process.env.AEGIS_SKILLS_DIR)
  // Same override as apps/web/lib/aegis-paths.js (Phase 0).
  if (process.env.AEGIS_PACKAGE_DIR) return path.resolve(process.env.AEGIS_PACKAGE_DIR, 'skills')
  if (cachedDir) return cachedDir
  const candidates = [path.join(__dirname, '..', 'skills')]
  let cur = process.cwd()
  for (let i = 0; i < 6; i++) {
    candidates.push(path.join(cur, 'packages', 'aegis', 'skills'), path.join(cur, 'node_modules', 'aegis-skills', 'skills'))
    const up = path.dirname(cur)
    if (up === cur) break
    cur = up
  }
  cachedDir = path.resolve(candidates.find(isDir) || candidates[0])
  return cachedDir
}

async function readRawManifest (skillName) {
  if (typeof skillName !== 'string' || !SAFE_NAME.test(skillName)) return null
  const root = getSkillsDir()
  const file = path.resolve(root, skillName, 'skill.json')
  if (!file.startsWith(root + path.sep)) return null
  try {
    const v = JSON.parse(await fsp.readFile(file, 'utf8'))
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null
  } catch {
    return null
  }
}

function toPublic (raw) {
  const out = { ...raw }
  delete out.endpoints
  out.phases = (Array.isArray(raw.phases) ? raw.phases : []).map(p =>
    p.auto ? { id: p.id, tokens: p.tokens, auto: true } : { id: p.id, tokens: p.tokens }
  )
  return out
}

async function getSkillManifest (skillName) {
  const raw = await readRawManifest(skillName)
  return raw ? toPublic(raw) : null
}

async function listSkills () {
  let entries
  try { entries = await fsp.readdir(getSkillsDir(), { withFileTypes: true }) } catch { return [] }
  const rows = await Promise.all(entries.filter(e => e.isDirectory()).map(async e => {
    const m = await getSkillManifest(e.name)
    if (!m) return null
    return {
      name: m.name,
      version: m.version,
      description: m.description,
      frameworks: m.frameworks || [],
      tags: m.tags || [],
      phases: m.phases.length,
      // Authored phases exclude machine-generated intel feeds (auto: true).
      authoredPhases: m.phases.filter(p => !p.auto).length,
      live: m.phases.some(p => p.auto),
      context: m.context || null,
      healthScore: null
    }
  }))
  return rows.filter(Boolean).sort((a, b) => a.name.localeCompare(b.name))
}

async function getPhaseRef (skillName, phaseId) {
  if (typeof phaseId !== 'string' || phaseId.length === 0 || phaseId.length > 80) return null
  const raw = await readRawManifest(skillName)
  if (!raw || !Array.isArray(raw.phases)) return null
  const phase = raw.phases.find(p => p && p.id === phaseId)
  if (!phase || typeof phase.file !== 'string' || !PHASE_FILE.test(phase.file)) return null
  return phase.file
}

async function getPhaseContent (skillName, phaseId) {
  const ref = await getPhaseRef(skillName, phaseId)
  if (!ref) return null
  const skillRoot = path.resolve(getSkillsDir(), skillName)
  const refPath = path.resolve(skillRoot, ref)
  if (!refPath.startsWith(skillRoot + path.sep)) return null
  let real, realRoot
  try {
    real = await fsp.realpath(refPath)
    realRoot = await fsp.realpath(skillRoot)
  } catch {
    return null
  }
  // Re-check after resolving symlinks so a link cannot escape the skill folder.
  if (!real.startsWith(realRoot + path.sep)) return null
  try { return await fsp.readFile(real, 'utf8') } catch { return null }
}

module.exports = { listSkills, getSkillManifest, getPhaseContent, getPhaseRef, getSkillsDir }
