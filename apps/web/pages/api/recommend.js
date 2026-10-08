'use strict'

const { listSkills } = require('../../lib/skill-reader')
const { handleCors } = require('../../lib/cors')

const config = { api: { bodyParser: { sizeLimit: '4kb' } } }

function scoreSkill (skill, environments, attackSurfaceTags) {
  const ctx = skill.context
  if (!ctx) return 0

  const skillEnvs = Array.isArray(ctx.environments) ? ctx.environments : []
  const skillTags = Array.isArray(ctx['attack-surface-tags']) ? ctx['attack-surface-tags'] : []

  let score = 0
  for (const env of environments) {
    if (skillEnvs.includes(env)) score += 2
  }
  for (const tag of attackSurfaceTags) {
    if (skillTags.includes(tag)) score += 1
  }
  return score
}

function isStringArray (value) {
  return Array.isArray(value) && value.every(v => typeof v === 'string')
}

function validateBody (body) {
  if (!body || typeof body !== 'object') return 'Request body is required'
  if (!isStringArray(body.environments)) return 'environments must be an array of strings'
  if (!isStringArray(body.attack_surface_tags)) return 'attack_surface_tags must be an array of strings'
  if (body.environments.length > 20) return 'environments exceeds maximum of 20 items'
  if (body.attack_surface_tags.length > 20) return 'attack_surface_tags exceeds maximum of 20 items'
  return null
}

async function handler (req, res) {
  if (handleCors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const validationError = validateBody(req.body)
  if (validationError) return res.status(400).json({ error: 'Invalid request' })

  const { environments, attack_surface_tags: attackSurfaceTags } = req.body
  const skills = await listSkills()

  const scored = skills
    .map(skill => ({
      ...skill,
      relevance_score: scoreSkill(skill, environments, attackSurfaceTags)
    }))
    .sort((a, b) => b.relevance_score - a.relevance_score)

  return res.status(200).json({ skills: scored })
}

module.exports = handler
module.exports.default = handler
module.exports.config = config
