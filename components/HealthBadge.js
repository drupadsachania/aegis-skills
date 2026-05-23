'use strict'

const React = require('react')

function HealthBadge ({ score }) {
  if (score == null || typeof score !== 'number') return null

  const pct = Math.round(score * 100)

  let colorClass
  if (score >= 0.90) {
    colorClass = 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/50'
  } else if (score >= 0.75) {
    colorClass = 'bg-amber-900/40 text-amber-400 border border-amber-800/50'
  } else {
    colorClass = 'bg-red-900/40 text-red-400 border border-red-800/50'
  }

  return React.createElement(
    'span',
    {
      className: `text-xs px-2 py-0.5 rounded font-mono ${colorClass}`,
      'aria-label': `Health score: ${pct}%`
    },
    `${pct}%`
  )
}

module.exports = HealthBadge
module.exports.default = HealthBadge
