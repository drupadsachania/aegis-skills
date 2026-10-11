'use strict'

const React = require('react')
const { useState } = React
const CodeBlock = require('./CodeBlock')
const StatusPill = require('./StatusPill')

const h = React.createElement

/**
 * Generic install tabs.
 * @param {{ tabs: { id: string, label: string, steps: { text?: string, label?: string, code?: string }[] }[] }} props
 */
function InstallTabs ({ tabs }) {
  const [active, setActive] = useState(tabs && tabs[0] ? tabs[0].id : null)
  if (!tabs || tabs.length === 0) return null
  const current = tabs.find(t => t.id === active) || tabs[0]

  return h(
    'div',
    { className: 'install-tabs' },
    h(
      'div',
      { className: 'install-tab-bar', role: 'tablist' },
      ...tabs.map(t => h(
        'button',
        {
          key: t.id,
          type: 'button',
          role: 'tab',
          'aria-selected': t.id === current.id,
          className: ['install-tab-btn', t.id === current.id ? 'active' : ''].join(' ').trim(),
          onClick: () => setActive(t.id)
        },
        t.label
      ))
    ),
    h(
      'div',
      { className: 'install-tab-content', role: 'tabpanel' },
      current.availability === 'in-development'
        ? h('div', { className: 'install-indev' },
          h(StatusPill, { status: 'in-development' }),
          h('p', null, 'Themis is being matured locally and is not published yet. It will be announced here and is not available through AI directories yet. You can run it today from the repository — see the ', h('a', { href: '/docs/themis' }, 'Themis docs'), '.'))
        : current.availability
          ? h('p', { className: 'install-later' }, 'Available after the first release. Nothing is published yet, so this command will not work until then.')
          : null,
      ...current.steps.map((s, i) => h(
        React.Fragment,
        { key: `${current.id}-${i}` },
        s.text ? h('p', { className: 'install-note' }, s.text) : null,
        s.code ? h(CodeBlock, { label: s.label || 'shell', content: s.code }) : null
      ))
    )
  )
}

module.exports = InstallTabs
module.exports.default = InstallTabs
