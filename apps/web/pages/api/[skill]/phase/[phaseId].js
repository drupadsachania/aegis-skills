'use strict'

const { getSkillManifest, getPhaseContent } = require('../../../../lib/skill-reader')
const { logInvocation, detectPlatform } = require('../../../../lib/telemetry')
const { handleCors } = require('../../../../lib/cors')

async function handler (req, res) {
  if (handleCors(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  // M5: coerce to string
  const skill = Array.isArray(req.query.skill) ? req.query.skill[0] : req.query.skill
  const phaseId = Array.isArray(req.query.phaseId) ? req.query.phaseId[0] : req.query.phaseId

  const manifest = await getSkillManifest(skill)
  // M6: don't echo attacker input
  if (!manifest) return res.status(404).json({ error: 'skill not found' })

  const content = await getPhaseContent(skill, phaseId)
  if (content === null) return res.status(404).json({ error: 'phase not found' })

  const platform = detectPlatform(req.headers['user-agent'])
  logInvocation({ skill, phase: phaseId, platform })

  res.setHeader('Content-Type', 'text/markdown')
  res.status(200).send(content)
}

module.exports = handler
module.exports.default = handler
