'use strict'

const React = require('react')

const h = React.createElement

// `exists` is decided at build time (getStaticProps) so a missing image renders a placeholder.
function Screenshot ({ src, alt, caption, exists }) {
  return h(
    'figure',
    { className: 'screenshot', 'data-reveal': '' },
    exists
      ? h('img', { src, alt, loading: 'lazy', width: 1600, height: 1000 })
      : h('div', { className: 'screenshot-placeholder', role: 'img', 'aria-label': alt }, `Screenshot pending: ${alt}`),
    h('figcaption', null, caption)
  )
}

module.exports = Screenshot
module.exports.default = Screenshot
