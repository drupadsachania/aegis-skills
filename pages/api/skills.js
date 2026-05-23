'use strict'

const { listSkills } = require('../../lib/skill-reader')
const { handleCors } = require('../../lib/cors')

async function handler (req, res) {
  if (handleCors(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const skills = await listSkills()
  res.status(200).json({ skills })
}

module.exports = handler
module.exports.default = handler
