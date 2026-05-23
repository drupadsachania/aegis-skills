'use strict'

const React = require('react')
const { useState } = React
const Layout = require('../components/Layout')
const SkillCard = require('../components/SkillCard')
const PlatformBadge = require('../components/PlatformBadge')
const { listSkills } = require('../lib/skill-reader')

const PLATFORMS = ['chatgpt', 'claude', 'cursor', 'gemini']

const STEPS = [
  { n: '01', label: 'Write SKILL.md', desc: 'Author your skill in a single markdown bundle with phases and metadata.' },
  { n: '02', label: 'Compile artifacts', desc: 'Run aegis compile — generates system prompt, OpenAI action, and MCP manifest.' },
  { n: '03', label: 'Deploy anywhere', desc: 'Push to Vercel. Paste the system prompt or wire the MCP endpoint — done.' }
]

function getFilterOptions (skills) {
  const tags = new Set()
  const envs = new Set()
  for (const skill of skills) {
    for (const t of (skill.tags || [])) tags.add(t)
    for (const e of (((skill.context) || {}).environments || [])) envs.add(e)
  }
  return { tags: [...tags].sort(), environments: [...envs].sort() }
}

function applyTagFilter (skills, selectedTags) {
  if (selectedTags.size === 0) return skills
  return skills.filter(skill =>
    [...selectedTags].every(t =>
      (skill.tags || []).includes(t) ||
      (((skill.context) || {}).environments || []).includes(t)
    )
  )
}

function FilterSidebar ({ options, selectedTags, onToggle }) {
  if (options.tags.length === 0 && options.environments.length === 0) return null

  function CheckItem ({ value }) {
    return React.createElement(
      'label',
      { key: value, className: 'flex items-center gap-2 text-sm text-zinc-300 cursor-pointer hover:text-zinc-100' },
      React.createElement('input', {
        type: 'checkbox',
        checked: selectedTags.has(value),
        onChange: () => onToggle(value),
        className: 'rounded border-zinc-600 bg-zinc-800 text-indigo-400 focus:ring-indigo-400'
      }),
      value
    )
  }

  return React.createElement(
    'aside',
    { className: 'w-52 shrink-0' },
    React.createElement('h3', { className: 'text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3' }, 'Filter'),
    options.environments.length > 0
      ? React.createElement(
          'div',
          { className: 'mb-4' },
          React.createElement('p', { className: 'text-xs text-zinc-500 mb-2' }, 'Environments'),
          React.createElement(
            'div', { className: 'flex flex-col gap-1.5' },
            ...options.environments.map(e => React.createElement(CheckItem, { key: e, value: e }))
          )
        )
      : null,
    options.tags.length > 0
      ? React.createElement(
          'div',
          null,
          React.createElement('p', { className: 'text-xs text-zinc-500 mb-2 mt-3' }, 'Tags'),
          React.createElement(
            'div', { className: 'flex flex-col gap-1.5' },
            ...options.tags.map(t => React.createElement(CheckItem, { key: t, value: t }))
          )
        )
      : null,
    selectedTags.size > 0
      ? React.createElement(
          'button',
          {
            onClick: () => [...selectedTags].forEach(t => onToggle(t)),
            className: 'mt-4 text-xs text-zinc-500 hover:text-zinc-300 underline'
          },
          'Clear filters'
        )
      : null
  )
}

const COMMON_ENVIRONMENTS = ['enterprise', 'cloud', 'hybrid', 'ot', 'remote-workforce', 'saas']
const COMMON_TAGS = ['network', 'endpoint', 'web-application', 'api', 'lateral-movement', 'credential-theft', 'supply-chain', 'detection', 'compliance']

function RecommendForm ({ onResults, onClear, loading }) {
  const [selectedEnvs, setSelectedEnvs] = useState(new Set())
  const [selectedTags, setSelectedTags] = useState(new Set())
  const [error, setError] = useState(null)

  function toggleSet (setter, value) {
    setter(prev => {
      const next = new Set(prev)
      next.has(value) ? next.delete(value) : next.add(value)
      return next
    })
  }

  async function handleSubmit (e) {
    e.preventDefault()
    setError(null)
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          environments: [...selectedEnvs],
          attack_surface_tags: [...selectedTags]
        })
      })
      if (!res.ok) { setError('Recommendation failed. Try again.'); return }
      const data = await res.json()
      onResults(data.skills)
    } catch {
      setError('Network error. Try again.')
    }
  }

  function handleClear () {
    setSelectedEnvs(new Set())
    setSelectedTags(new Set())
    setError(null)
    onClear()
  }

  function PillToggle ({ value, selected, onToggle: toggle }) {
    return React.createElement(
      'button',
      {
        type: 'button',
        onClick: () => toggle(value),
        className: [
          'text-xs px-3 py-1 rounded-full border transition-colors',
          selected
            ? 'bg-indigo-600 border-indigo-500 text-white'
            : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-indigo-500'
        ].join(' ')
      },
      value
    )
  }

  return React.createElement(
    'form',
    {
      onSubmit: handleSubmit,
      className: 'p-5 rounded-lg border border-zinc-800 bg-zinc-900 mb-8'
    },
    React.createElement('h3', { className: 'text-zinc-100 font-semibold mb-1' }, 'Find skills for your environment'),
    React.createElement('p', { className: 'text-zinc-400 text-sm mb-4' }, 'Select your environments and attack surface focus areas.'),
    React.createElement('p', { className: 'text-xs text-zinc-500 mb-2' }, 'Environments'),
    React.createElement(
      'div', { className: 'flex flex-wrap gap-2 mb-4' },
      ...COMMON_ENVIRONMENTS.map(e =>
        React.createElement(PillToggle, { key: e, value: e, selected: selectedEnvs.has(e), onToggle: v => toggleSet(setSelectedEnvs, v) })
      )
    ),
    React.createElement('p', { className: 'text-xs text-zinc-500 mb-2' }, 'Attack surface'),
    React.createElement(
      'div', { className: 'flex flex-wrap gap-2 mb-5' },
      ...COMMON_TAGS.map(t =>
        React.createElement(PillToggle, { key: t, value: t, selected: selectedTags.has(t), onToggle: v => toggleSet(setSelectedTags, v) })
      )
    ),
    error ? React.createElement('p', { className: 'text-red-400 text-sm mb-3' }, error) : null,
    React.createElement(
      'div', { className: 'flex gap-3' },
      React.createElement(
        'button',
        {
          type: 'submit',
          disabled: loading || (selectedEnvs.size === 0 && selectedTags.size === 0),
          className: 'px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors'
        },
        loading ? 'Finding…' : 'Find skills'
      ),
      React.createElement(
        'button',
        {
          type: 'button',
          onClick: handleClear,
          className: 'px-4 py-2 rounded border border-zinc-700 text-zinc-300 hover:border-zinc-500 text-sm transition-colors'
        },
        'Clear'
      )
    )
  )
}

function HomePage ({ skills: initialSkills }) {
  const [selectedTags, setSelectedTags] = useState(new Set())
  const [recommendedSkills, setRecommendedSkills] = useState(null)
  const [recommendLoading, setRecommendLoading] = useState(false)

  const filterOptions = getFilterOptions(initialSkills)

  function toggleTag (tag) {
    setSelectedTags(prev => {
      const next = new Set(prev)
      next.has(tag) ? next.delete(tag) : next.add(tag)
      return next
    })
    setRecommendedSkills(null)
  }

  async function handleRecommend (skills) {
    setRecommendLoading(true)
    setSelectedTags(new Set())
    setRecommendedSkills(skills)
    setRecommendLoading(false)
  }

  function handleClearRecommend () {
    setRecommendedSkills(null)
    setSelectedTags(new Set())
  }

  const displaySkills = recommendedSkills != null
    ? recommendedSkills
    : applyTagFilter(initialSkills, selectedTags)

  return React.createElement(
    Layout,
    null,
    React.createElement(
      'section',
      { className: 'py-20 text-center' },
      React.createElement(
        'h1',
        { className: 'text-4xl font-bold text-zinc-100 mb-4 tracking-tight' },
        'Platform-agnostic AI skills, built for defenders.',
        React.createElement('br'),
        React.createElement('span', { className: 'text-indigo-400' }, 'Write once, deploy anywhere.')
      ),
      React.createElement(
        'p',
        { className: 'text-zinc-400 text-lg mb-10 max-w-xl mx-auto' },
        'One SKILL.md compiles to every platform format — system prompt, ChatGPT Action, and MCP endpoint.'
      ),
      React.createElement(
        'div',
        { className: 'flex items-center justify-center gap-3 mb-14' },
        ...PLATFORMS.map(p => React.createElement(PlatformBadge, { key: p, platform: p }))
      ),
      React.createElement(
        'div',
        { className: 'grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-3xl mx-auto' },
        ...STEPS.map(step =>
          React.createElement(
            'div',
            { key: step.n, className: 'p-5 rounded-lg border border-zinc-800 bg-zinc-900' },
            React.createElement('span', { className: 'text-indigo-400 text-xs font-mono mb-2 block' }, step.n),
            React.createElement('h3', { className: 'text-zinc-100 font-semibold mb-1' }, step.label),
            React.createElement('p', { className: 'text-zinc-400 text-sm leading-relaxed' }, step.desc)
          )
        )
      )
    ),
    React.createElement(
      'section',
      { className: 'pb-20' },
      React.createElement(RecommendForm, {
        onResults: handleRecommend,
        onClear: handleClearRecommend,
        loading: recommendLoading
      }),
      React.createElement(
        'div',
        { className: 'flex items-center justify-between mb-2' },
        React.createElement('h2', { className: 'text-2xl font-semibold text-zinc-100' }, 'Skills'),
        recommendedSkills != null
          ? React.createElement('span', { className: 'text-sm text-indigo-400' }, 'Ranked by relevance')
          : null
      ),
      React.createElement(
        'p',
        { className: 'text-zinc-400 mb-8' },
        `${displaySkills.length} skill${displaySkills.length === 1 ? '' : 's'}${selectedTags.size > 0 ? ' matching filter' : ''}`
      ),
      React.createElement(
        'div',
        { className: 'flex gap-8' },
        React.createElement(FilterSidebar, {
          options: filterOptions,
          selectedTags,
          onToggle: toggleTag
        }),
        React.createElement(
          'div',
          { className: 'flex-1' },
          displaySkills.length === 0
            ? React.createElement('p', { className: 'text-zinc-500 text-sm' }, 'No skills match the current filter.')
            : React.createElement(
                'div',
                { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
                ...displaySkills.map(skill =>
                  React.createElement(SkillCard, {
                    key: skill.name,
                    skill,
                    healthScore: skill.healthScore != null ? skill.healthScore : null
                  })
                )
              )
        )
      )
    )
  )
}

async function getStaticProps () {
  const skills = await listSkills()
  return { props: { skills } }
}

const pageExports = { default: HomePage, getStaticProps }
module.exports = pageExports
module.exports.default = HomePage
