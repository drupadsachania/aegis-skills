'use strict'

const fs = require('fs').promises
const path = require('path')

const SKILLS_DIR = path.join(process.cwd(), 'skills')

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
  const manifestPath = path.join(SKILLS_DIR, skillName, 'skill.json')
  try {
    const raw = await fs.readFile(manifestPath, 'utf8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function getPhaseContent (skillName, phaseId) {
  const manifest = await getSkillManifest(skillName)
  if (!manifest) return null

  const phase = manifest.phases.find(p => p.id === phaseId)
  if (!phase || !phase.ref) return null

  const refPath = path.join(SKILLS_DIR, skillName, phase.ref)
  try {
    return await fs.readFile(refPath, 'utf8')
  } catch {
    return null
  }
}

module.exports = { listSkills, getSkillManifest, getPhaseContent }
