'use strict'

const React = require('react')
const { useState, useRef, useEffect } = React

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

  return React.createElement(
    'button',
    {
      onClick: handleClick,
      className: ['copy-btn', copied ? 'copied' : ''].join(' ').trim()
    },
    copied ? 'COPIED' : (label || 'COPY')
  )
}

module.exports = CopyButton
module.exports.default = CopyButton
