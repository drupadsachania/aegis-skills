'use strict'

function handler (req, res) {
  res.status(200).json({ ok: true })
}

module.exports = handler
module.exports.default = handler
