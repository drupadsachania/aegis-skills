'use strict'

const React = require('react')

const h = React.createElement

// A small availability label. Never colour-only: the text says what the status is and a dot adds a
// second, shape-based cue. Colours come from tokens (CSS: .status-pill). Add a status here, not at call sites.
const STATUSES = {
  'in-development': { label: 'In development', tone: 'themis' },
  'first-release': { label: 'First release', tone: 'aegis' },
  available: { label: 'Available', tone: 'aegis' }
}

function StatusPill ({ status = 'in-development', label, className = '' }) {
  const s = STATUSES[status]
  if (!s) return null
  return h('span', { className: ['status-pill', `status-pill-${s.tone}`, className].join(' ').trim(), 'data-status': status },
    h('span', { className: 'status-pill-dot', 'aria-hidden': 'true' }),
    label || s.label)
}

module.exports = StatusPill
module.exports.default = StatusPill
module.exports.STATUSES = STATUSES
