'use strict'

const { getSkillManifest } = require('../../../lib/skill-reader')
const { handleCors } = require('../../../lib/cors')

async function handler (req, res) {
  if (handleCors(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { skill } = req.query
  const manifest = await getSkillManifest(skill)
  if (!manifest) return res.status(404).json({ error: `skill not found: ${skill}` })

  res.status(200).json(manifest)
}

module.exports = handler
module.exports.default = handler
