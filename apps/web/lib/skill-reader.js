'use strict'

/**
 * Website adapter over the Aegis skill reader. Skill content lives in the
 * aegis-skills workspace package; the only website concern added here is the
 * health score from health.json, which is a website artefact.
 */

const fs = require('fs').promises
const aegis = require('aegis-skills/mcp/skill-reader')
const { healthFile } = require('./aegis-paths')

async function listSkills () {
  const skills = await aegis.listSkills()
  const scores = {}
  try {
    const health = JSON.parse(await fs.readFile(healthFile(), 'utf8'))
    for (const [name, data] of Object.entries(health.skills || {})) {
      if (typeof data['health-score'] === 'number') scores[name] = data['health-score']
    }
  } catch { /* no health data: scores stay null */ }
  return skills.map(s => ({ ...s, healthScore: scores[s.name] ?? null }))
}

module.exports = {
  listSkills,
  getSkillManifest: aegis.getSkillManifest,
  getPhaseContent: aegis.getPhaseContent,
  getPhaseRef: aegis.getPhaseRef
}
