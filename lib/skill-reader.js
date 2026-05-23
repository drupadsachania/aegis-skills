'use strict'

const fs = require('fs').promises
const path = require('path')

const SKILLS_DIR = path.join(process.cwd(), 'skills')

// Allow-list: lowercase/uppercase letters, digits, hyphens, underscores, dots. 1-64 chars.
// Blocks: ..  /  \  null bytes  spaces  and anything path-traversal-shaped
const SAFE_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/

async function listSkills () {
  let entries
  try {
    entries = await fs.readdir(SKILLS_DIR, { withFileTypes: true })
  } catch {
    return []
  }

  const results = await Promise.all(
    entries
      .filter(e => e.isDirectory())
      .map(async e => {
        const manifest = await getSkillManifest(e.name)
        if (!manifest) return null
        return {
          name: manifest.name,
          version: manifest.version,
          description: manifest.description,
          frameworks: manifest.frameworks || [],
          tags: manifest.tags || [],
          phases: (manifest.phases || []).length
        }
      })
  )

  return results.filter(Boolean)
}

async function getSkillManifest (skillName) {
  // C1 fix: allow-list + containment check
  if (typeof skillName !== 'string' || !SAFE_NAME.test(skillName)) return null

  const skillsRoot = path.resolve(SKILLS_DIR)
  const manifestPath = path.resolve(SKILLS_DIR, skillName, 'skill.json')

  // Defense in depth: resolved path must stay inside SKILLS_DIR
  if (!manifestPath.startsWith(skillsRoot + path.sep)) return null

  try {
    const raw = await fs.readFile(manifestPath, 'utf8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function getPhaseContent (skillName, phaseId) {
  // skillName is validated inside getSkillManifest
  const manifest = await getSkillManifest(skillName)
  if (!manifest) return null

  // phaseId is only used for === comparison against manifest data (safe)
  // but validate it is a string to avoid type confusion
  if (typeof phaseId !== 'string') return null

  const phase = manifest.phases.find(p => p.id === phaseId)
  if (!phase || typeof phase.ref !== 'string') return null

  // C2 fix: resolve ref relative to the skill's own directory and check containment
  const skillRoot = path.resolve(SKILLS_DIR, skillName)
  const refPath = path.resolve(skillRoot, phase.ref)

  // Must stay within the specific skill's directory
  if (!refPath.startsWith(skillRoot + path.sep)) return null

  // Resolve symlinks and re-check containment to block symlink escapes
  let realRef
  try {
    realRef = await fs.realpath(refPath)
  } catch {
    return null
  }
  if (!realRef.startsWith(skillRoot + path.sep)) return null

  try {
    return await fs.readFile(realRef, 'utf8')
  } catch {
    return null
  }
}

module.exports = { listSkills, getSkillManifest, getPhaseContent }
