'use strict'

const React = require('react')

function SkillCard({ skill }) {
  const { name, description, tags, frameworks, phases } = skill
  const excerpt = description && description.length > 120
    ? description.slice(0, 120).trimEnd() + '…'
    : (description || '')

  return React.createElement(
    'a',
    {
      href: `/skills/${name}`,
      className: [
        'block p-5 rounded-lg border border-zinc-800 bg-zinc-900',
        'hover:border-indigo-500 transition-colors no-underline'
      ].join(' ')
    },
    // Name + phase count row
    React.createElement(
      'div',
      { className: 'flex items-start justify-between gap-2 mb-2' },
      React.createElement(
        'h2',
        { className: 'text-zinc-100 font-semibold text-base leading-snug' },
        name
      ),
      React.createElement(
        'span',
        { className: 'shrink-0 text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full' },
        `${phases} phase${phases === 1 ? '' : 's'}`
      )
    ),
    // Description excerpt
    React.createElement(
      'p',
      { className: 'text-zinc-400 text-sm leading-relaxed mb-3' },
      excerpt
    ),
    // Tags + frameworks
    React.createElement(
      'div',
      { className: 'flex flex-wrap gap-1.5' },
      ...(tags || []).map(tag =>
        React.createElement(
          'span',
          { key: `tag-${tag}`, className: 'text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300' },
          tag
        )
      ),
      ...(frameworks || []).map(fw =>
        React.createElement(
          'span',
          { key: `fw-${fw}`, className: 'text-xs px-2 py-0.5 rounded bg-indigo-900/40 text-indigo-300 border border-indigo-800/50' },
          fw
        )
      )
    )
  )
}

module.exports = SkillCard
module.exports.default = SkillCard
