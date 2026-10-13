'use strict'

const React = require('react')
const StatusPill = require('./StatusPill')

const h = React.createElement

// One row per install path: big serif title, mono "who it's for" caption,
// a short description and an arrow affordance. Each row links to its section.
function PathMatrix ({ paths, linkBase = '/paths' }) {
  return h(
    'ul',
    { className: 'path-list path-matrix' },
    ...paths.map(p => h(
      'li',
      { key: p.id, 'data-reveal': '' },
      h('a', { href: `${linkBase}#${p.id}`, className: 'path-row' },
        h('span', { className: 'pr-main' },
          h('span', { className: 'pr-title' }, p.title),
          h('span', { className: 'pr-for' }, `For · ${p.audience}`),
          p.status ? h(StatusPill, { status: p.status, className: 'pr-status' }) : null),
        h('span', { className: 'pr-how' }, p.how),
        h('span', { className: 'pr-go' },
          h('span', { className: 'pr-label' }, 'Set up'),
          h('span', { className: 'pr-arrow', 'aria-hidden': 'true' }, '→')))
    ))
  )
}

module.exports = PathMatrix
module.exports.default = PathMatrix
