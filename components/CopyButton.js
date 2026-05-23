'use strict'

const React = require('react')
const { useState } = React

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false)

  function handleClick() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return React.createElement(
    'button',
    {
      onClick: handleClick,
      className: [
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors',
        'bg-zinc-800 text-zinc-300 border border-zinc-700',
        'hover:bg-indigo-500 hover:text-white hover:border-indigo-500'
      ].join(' ')
    },
    copied ? '✓' : label
  )
}

module.exports = CopyButton
module.exports.default = CopyButton
