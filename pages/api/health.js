'use strict'

function handler (req, res) {
  res.status(200).json({ ok: true, cwd: process.cwd() })
}

module.exports = handler
module.exports.default = handler
