'use strict'

const { getSkillManifest, getPhaseContent } = require('../../../lib/skill-reader')
const { logInvocation, detectPlatform } = require('../../../lib/telemetry')
const { handleCors } = require('../../../lib/cors')

module.exports = async function handler (req, res) {
  if (handleCors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { skill } = req.query
  const { phase } = req.body || {}

  if (!phase) return res.status(400).json({ error: 'phase is required' })

  const manifest = await getSkillManifest(skill)
  if (!manifest) return res.status(404).json({ error: `skill not found: ${skill}` })

  const content = await getPhaseContent(skill, phase)
  if (content === null) return res.status(404).json({ error: `phase not found: ${phase}` })

  const platform = detectPlatform(req.headers['user-agent'])
  logInvocation({ skill, phase, platform })

  res.status(200).json({ phase, content })
}
