'use strict'

const React = require('react')

const PLATFORM_LABELS = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  cursor: 'Cursor',
  gemini: 'Gemini'
}

function PlatformBadge({ platform }) {
  const label = PLATFORM_LABELS[platform] || platform
  return React.createElement(
    'span',
    {
      className: 'inline-flex items-center px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-700'
    },
    label
  )
}

module.exports = PlatformBadge
module.exports.default = PlatformBadge
