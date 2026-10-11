'use strict'

const React = require('react')

const h = React.createElement

function PathMatrix ({ paths, linkBase = '/paths' }) {
  return h(
    'div',
    { style: { border: '1px solid var(--border-dim)', overflowX: 'auto' } },
    h(
      'table',
      { className: 'platforms-table path-matrix' },
      h('thead', null, h('tr', null,
        h('th', null, 'Path'), h('th', null, 'For'), h('th', null, 'How'), h('th', null, ''))),
      h('tbody', null, ...paths.map(p => h(
        'tr',
        { key: p.id },
        h('td', { className: 'pm-title' }, p.title),
        h('td', null, p.audience),
        h('td', null, p.how),
        h('td', null, h('a', { href: `${linkBase}#${p.id}`, className: 'twin-link' }, 'Set up →'))
      )))
    )
  )
}

module.exports = PathMatrix
module.exports.default = PathMatrix
