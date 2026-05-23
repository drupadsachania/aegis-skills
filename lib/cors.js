'use strict'

function setCorsHeaders (res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

/**
 * Sets CORS headers and handles OPTIONS preflight.
 * Returns true if the request was an OPTIONS preflight (caller should return early).
 */
function handleCors (req, res) {
  setCorsHeaders(res)
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return true
  }
  return false
}

module.exports = { handleCors, setCorsHeaders }
