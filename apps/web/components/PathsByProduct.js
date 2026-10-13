'use strict'

const React = require('react')
const CodeBlock = require('./CodeBlock')
const PathMatrix = require('./PathMatrix')
const StatusPill = require('./StatusPill')

const h = React.createElement

// Aegis and Themis are installed differently, so the install paths are shown per product: what it is, how ready
// it is, the quickest start, then that product's own paths. Both use the same PATHS data (install-commands.js).
const PRODUCTS = {
  aegis: {
    name: 'Aegis',
    role: 'Skill pack',
    status: 'available',
    blurb: 'Install the skills into your assistant, connect the read-only MCP, or paste one file into any chat AI. Nothing to sign up for, and it never calls a model.',
    start: { label: 'Fastest start, in a terminal', code: 'npx aegis-skills install --platform claude', hint: 'Also codex, gemini, cursor, vscode and antigravity.' },
    guide: { href: '/docs/aegis/getting-started', label: 'Getting started with npx' }
  },
  themis: {
    name: 'Themis',
    role: 'SOC agent',
    status: 'in-development',
    blurb: 'A governed agent that plans a task and uses the Aegis skills, on your own machine. It is still being matured: you run it from the repository today, and the npm and directory installs are not available yet.',
    start: null,
    guide: { href: '/themis', label: 'How Themis works and how to run it today' }
  }
}

function PathsByProduct ({ paths, linkBase = '/paths' }) {
  return h('div', { className: 'pp-grid' },
    ...Object.keys(PRODUCTS).map(key => {
      const prod = PRODUCTS[key]
      const own = paths.filter(p => p.product === key)
      if (own.length === 0) return null
      return h('section', { key, className: `pp-col ${key}`, 'aria-labelledby': `pp-${key}`, 'data-reveal': '' },
        h('div', { className: 'pp-head' },
          h('span', { className: 'pp-marker', 'aria-hidden': 'true' }),
          h('h3', { id: `pp-${key}` }, prod.name),
          h('span', { className: 'pp-role' }, prod.role),
          h(StatusPill, { status: prod.status, className: 'pp-status' })),
        h('p', { className: 'pp-blurb' }, prod.blurb),
        prod.start ? h('div', { className: 'pp-start' },
          h('p', { className: 'pp-start-label' }, prod.start.label),
          h(CodeBlock, { label: 'shell', content: prod.start.code }),
          h('p', { className: 'pp-hint' }, prod.start.hint)) : null,
        h('p', { className: 'pp-paths-label' }, `${own.length} ${own.length === 1 ? 'way' : 'ways'} to use ${prod.name}`),
        h(PathMatrix, { paths: own, linkBase }),
        h('p', { className: 'pp-guide' }, h('a', { href: prod.guide.href }, prod.guide.label, ' →')))
    }))
}

module.exports = PathsByProduct
module.exports.default = PathsByProduct
module.exports.PRODUCTS = PRODUCTS
