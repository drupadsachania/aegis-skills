'use strict'

const { getSkillManifest, getPhaseContent } = require('../../../lib/skill-reader')
const { logInvocation, detectPlatform } = require('../../../lib/telemetry')
const { handleCors } = require('../../../lib/cors')

// H3: limit request body to 8kb
const config = { api: { bodyParser: { sizeLimit: '8kb' } } }

async function handler (req, res) {
  if (handleCors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // M5: coerce to string
  const skill = Array.isArray(req.query.skill) ? req.query.skill[0] : req.query.skill
  const { phase } = req.body || {}

  if (!phase) return res.status(400).json({ error: 'phase is required' })

  const manifest = await getSkillManifest(skill)
  // M6: don't echo attacker input
  if (!manifest) return res.status(404).json({ error: 'skill not found' })

  const content = await getPhaseContent(skill, phase)
  if (content === null) return res.status(404).json({ error: 'phase not found' })

  const platform = detectPlatform(req.headers['user-agent'])
  logInvocation({ skill, phase, platform })

  res.status(200).json({ phase, content })
}

module.exports = handler
module.exports.default = handler
module.exports.config = config
