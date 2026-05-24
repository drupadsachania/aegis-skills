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
    { className: 'platform-badge' },
    label
  )
}

module.exports = PlatformBadge
module.exports.default = PlatformBadge
