'use strict'

module.exports = function handler (req, res) {
  res.status(200).json({ ok: true, cwd: process.cwd() })
}
