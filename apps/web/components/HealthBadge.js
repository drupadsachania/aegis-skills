'use strict'

const React = require('react')

function HealthBadge({ score }) {
  if (score == null || typeof score !== 'number') return null
  const pct = Math.round(score * 100)

  // Reused as a plain number display in SkillCard table (pct-bar does the visual).
  // This component is kept for any standalone use.
  let dotColor = 'var(--gold)'
  if (score < 0.75) dotColor = 'rgba(227,189,72,0.4)'
  if (score < 0.50) dotColor = 'var(--muted)'

  return React.createElement(
    'span',
    {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        fontFamily: 'var(--f-mono)',
        fontSize: '10px',
        color: 'var(--muted)',
        letterSpacing: '0.06em'
      },
      'aria-label': `Health score: ${pct}%`
    },
    React.createElement('span', { style: { width: '5px', height: '5px', borderRadius: '50%', background: dotColor, flexShrink: 0 } }),
    `${pct}%`
  )
}

module.exports = HealthBadge
module.exports.default = HealthBadge
