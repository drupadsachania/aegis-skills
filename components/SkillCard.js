'use strict'

const React = require('react')

/**
 * Renders as a <tr> for use inside a .skills-table <tbody>.
 * Parent is responsible for rendering <table class="skills-table"><tbody>…</tbody></table>.
 */
function SkillCard({ skill, healthScore }) {
  const { name, description, tags, frameworks, phases } = skill
  const excerpt = description && description.length > 100
    ? description.slice(0, 100).trimEnd() + '…'
    : (description || '')

  const pct = healthScore != null ? Math.round(healthScore) : null

  const tagList = [
    ...(tags || []).map(t => React.createElement('span', { key: `tag-${t}`, className: 'tag-pill' }, t)),
    ...(frameworks || []).map(f => React.createElement('span', { key: `fw-${f}`, className: 'tag-pill purple' }, f))
  ]

  return React.createElement(
    'tr',
    {
      onClick: () => { window.location.href = `/skills/${name}` },
      style: { cursor: 'pointer' }
    },
    // Name column
    React.createElement(
      'td',
      null,
      React.createElement(
        'div',
        { className: 'skill-name-cell' },
        React.createElement('a', { href: `/skills/${name}`, onClick: e => e.stopPropagation() }, name)
      )
    ),
    // Description column
    React.createElement(
      'td',
      null,
      React.createElement('span', { style: { fontSize: '13px', color: 'var(--cream-dim)' } }, excerpt)
    ),
    // Tags column
    React.createElement(
      'td',
      null,
      tagList.length > 0
        ? React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px' } }, ...tagList)
        : null
    ),
    // Phases column
    React.createElement(
      'td',
      null,
      React.createElement('span', { className: 'phases-badge' }, `${phases} phase${phases === 1 ? '' : 's'}`)
    ),
    // Health score column
    React.createElement(
      'td',
      null,
      pct != null
        ? React.createElement(
            'div',
            { className: 'pct-bar' },
            React.createElement(
              'div',
              { className: 'pct-track' },
              React.createElement('div', { className: 'pct-fill', style: { width: `${Math.min(pct, 100)}%` } })
            ),
            React.createElement('span', { className: 'pct-num' }, `${pct}`)
          )
        : React.createElement('span', { className: 'pct-num', style: { color: 'var(--faint)' } }, '—')
    )
  )
}

module.exports = SkillCard
module.exports.default = SkillCard
