'use strict'

const React = require('react')

const PLATFORM_LABELS = {
  claude: 'Claude',
  'claude-ai': 'Claude.ai',
  'claude-code': 'Claude Code',
  chatgpt: 'ChatGPT',
  codex: 'Codex',
  gemini: 'Gemini',
  cursor: 'Cursor',
  vscode: 'VS Code',
  antigravity: 'Antigravity'
}

function PlatformBadge ({ platform }) {
  return React.createElement('span', { className: 'platform-badge' }, PLATFORM_LABELS[platform] || platform)
}

module.exports = PlatformBadge
module.exports.default = PlatformBadge
