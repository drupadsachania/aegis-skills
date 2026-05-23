'use strict'

const { getSkillManifest, getPhaseContent } = require('../../../../lib/skill-reader')
const { logInvocation, detectPlatform } = require('../../../../lib/telemetry')
const { handleCors } = require('../../../../lib/cors')

module.exports = async function handler (req, res) {
  if (handleCors(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { skill, phaseId } = req.query

  const manifest = await getSkillManifest(skill)
  if (!manifest) return res.status(404).json({ error: `skill not found: ${skill}` })

  const content = await getPhaseContent(skill, phaseId)
  if (content === null) return res.status(404).json({ error: `phase not found: ${phaseId}` })

  const platform = detectPlatform(req.headers['user-agent'])
  logInvocation({ skill, phase: phaseId, platform })

  res.setHeader('Content-Type', 'text/markdown')
  res.status(200).send(content)
}
