'use strict'

const fs = require('fs')
const path = require('path')

module.exports = async function handler(req, res) {
  try {
    const healthPath = path.join(process.cwd(), 'health.json')
    if (!fs.existsSync(healthPath)) {
      return res.status(404).json({ error: 'health.json not found' })
    }
    
    const healthContent = fs.readFileSync(healthPath, 'utf8')
    const healthData = JSON.parse(healthContent)
    
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.status(200).json(healthData)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
