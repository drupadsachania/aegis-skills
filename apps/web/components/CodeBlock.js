'use strict'

const React = require('react')
const CopyButton = require('./CopyButton')

function CodeBlock ({ label, content }) {
  return React.createElement(
    'div',
    { className: 'code-block' },
    React.createElement(
      'div',
      { className: 'code-hd' },
      React.createElement('span', { className: 'code-hd-label' }, label),
      React.createElement(CopyButton, { text: content, label: 'COPY' })
    ),
    React.createElement('pre', { className: 'code-body' }, content)
  )
}

module.exports = CodeBlock
module.exports.default = CodeBlock
