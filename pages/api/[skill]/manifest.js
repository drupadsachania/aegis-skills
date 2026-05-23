'use strict'

const { getSkillManifest } = require('../../../lib/skill-reader')
const { handleCors } = require('../../../lib/cors')

async function handler (req, res) {
  if (handleCors(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  // M5: coerce to string — Next.js parses duplicate params as arrays
  const skill = Array.isArray(req.query.skill) ? req.query.skill[0] : req.query.skill

  const manifest = await getSkillManifest(skill)
  // M6: don't echo attacker input in error message
  if (!manifest) return res.status(404).json({ error: 'skill not found' })

  res.status(200).json(manifest)
}

module.exports = handler
module.exports.default = handler
