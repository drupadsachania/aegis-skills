'use strict'

const React = require('react')
const { useState, useRef, useEffect } = React

const h = React.createElement

// Two stacked glyphs; CSS crossfades them (copy -> check) with a short scale pop.
function Glyphs () {
  const common = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true', focusable: 'false' }
  return h('span', { className: 'copy-ic', 'aria-hidden': 'true' },
    h('svg', Object.assign({ className: 'ic-copy' }, common),
      h('rect', { x: 9, y: 9, width: 11, height: 11, rx: 2 }),
      h('path', { d: 'M5 15V6a2 2 0 0 1 2-2h8' })),
    h('svg', Object.assign({ className: 'ic-check' }, common),
      h('path', { d: 'M5 12.5l4.5 4.5L19 7.5' })))
}

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  function handleClick() {
    navigator.clipboard.writeText(text).then(() => {
      if (timerRef.current) clearTimeout(timerRef.current)
      setCopied(true)
      timerRef.current = setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  return h(
    'button',
    {
      type: 'button',
      onClick: handleClick,
      className: ['copy-btn', copied ? 'copied' : ''].join(' ').trim()
    },
    h(Glyphs),
    h('span', { className: 'copy-label', 'aria-live': 'polite' }, copied ? 'COPIED' : (label || 'COPY'))
  )
}

module.exports = CopyButton
module.exports.default = CopyButton
