'use strict'

const React = require('react')
const CopyButton = require('./CopyButton')

const h = React.createElement

const SHELL_LABEL = /^(shell|bash|sh|zsh|powershell|terminal)$/i

// Shell blocks get a "$" prompt per command line. The prompt is CSS generated content
// (data-prompt), so it is not selectable and never lands in the clipboard or the copied text.
// Slash commands (/plugin ...), comments and continuation lines are not prompted.
function renderLines (content, label) {
  if (!SHELL_LABEL.test(label || '')) return content
  const lines = String(content).split('\n')
  let continued = false
  const out = []
  lines.forEach((line, i) => {
    const t = line.trim()
    const prompted = !continued && t !== '' && t[0] !== '/' && t[0] !== '#'
    continued = /\\\s*$/.test(line)
    out.push(h('span', { key: i, className: 'cmd', 'data-prompt': prompted ? '$' : undefined }, line))
    if (i < lines.length - 1) out.push('\n')
  })
  return out
}

// Terminal-window motif (DESIGN 8.5): neutral window dots, mono label, copy button.
// Decorative only: it shows the exact command to run and never any simulated output.
function CodeBlock ({ label, content }) {
  return h(
    'div',
    { className: 'code-block' },
    h(
      'div',
      { className: 'code-hd' },
      h('span', { className: 'term-dots', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')),
      h('span', { className: 'code-hd-label' }, label),
      h(CopyButton, { text: content, label: 'COPY' })
    ),
    h('pre', { className: 'code-body' }, renderLines(content, label))
  )
}

module.exports = CodeBlock
module.exports.default = CodeBlock
