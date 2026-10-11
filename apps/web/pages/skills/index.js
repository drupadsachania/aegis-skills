'use strict'

const React = require('react')
const { useState } = React
const Layout = require('../../components/Layout')

const COMMON_ENVIRONMENTS = ['enterprise', 'cloud', 'hybrid', 'ot', 'remote-workforce', 'saas']
const COMMON_TAGS = ['network', 'endpoint', 'web-application', 'api', 'lateral-movement', 'credential-theft', 'supply-chain', 'detection', 'compliance']

// Free-text match across everything a searcher might reasonably type: the skill
// name, its description, tags, frameworks and the environments it applies to.
function matchesQuery(skill, query) {
  if (!query) return true
  const ctx = skill.context || {}
  const haystack = [
    skill.name,
    skill.description,
    (skill.tags || []).join(' '),
    (skill.frameworks || []).join(' '),
    (ctx.environments || []).join(' '),
    (ctx['attack-surface-tags'] || []).join(' ')
  ].join(' ').toLowerCase()
  return haystack.includes(query)
}

function firstSentence(desc) {
  const text = String(desc || '').replace(/\s+/g, ' ').trim()
  const cut = text.split(/\.\s|\. Triggers|Triggers for:/)[0]
  return cut.length > 132 ? cut.slice(0, 132).trimEnd() + '…' : cut
}

// ─── Recommend form ───────────────────────────────────────────────────────────

function RecommendForm({ onResults, onClear, loading }) {
  const [selectedEnvs, setSelectedEnvs] = useState(new Set())
  const [selectedTags, setSelectedTags] = useState(new Set())
  const [error, setError] = useState(null)

  function toggleSet(setter, value) {
    setter(prev => {
      const next = new Set(prev)
      next.has(value) ? next.delete(value) : next.add(value)
      return next
    })
  }

  async function handleSubmit(e) {
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

  function handleClear() {
    setSelectedEnvs(new Set())
    setSelectedTags(new Set())
    setError(null)
    onClear()
  }

  function PillToggle({ value, selected, onToggle: toggle }) {
    return React.createElement(
      'button',
      {
        type: 'button',
        onClick: () => toggle(value),
        className: ['pill-toggle', selected ? 'selected' : ''].join(' ').trim()
      },
      value
    )
  }

  return React.createElement(
    'form',
    { onSubmit: handleSubmit, className: 'recommend-form' },
    React.createElement('h3', null, 'Find skills for your environment'),
    React.createElement('p', null, 'Select environments and attack surface focus areas to get ranked recommendations.'),
    React.createElement('span', { className: 'pill-group-label' }, 'Environments'),
    React.createElement(
      'div',
      { className: 'pill-group' },
      ...COMMON_ENVIRONMENTS.map(e =>
        React.createElement(PillToggle, { key: e, value: e, selected: selectedEnvs.has(e), onToggle: v => toggleSet(setSelectedEnvs, v) })
      )
    ),
    React.createElement('span', { className: 'pill-group-label' }, 'Attack surface'),
    React.createElement(
      'div',
      { className: 'pill-group' },
      ...COMMON_TAGS.map(t =>
        React.createElement(PillToggle, { key: t, value: t, selected: selectedTags.has(t), onToggle: v => toggleSet(setSelectedTags, v) })
      )
    ),
    error ? React.createElement('p', { className: 'form-error' }, error) : null,
    React.createElement(
      'div',
      { className: 'recommend-actions' },
      React.createElement(
        'button',
        {
          type: 'submit',
          disabled: loading || (selectedEnvs.size === 0 && selectedTags.size === 0),
          className: 'btn-primary'
        },
        loading ? 'FINDING…' : 'FIND SKILLS'
      ),
      React.createElement('button', { type: 'button', onClick: handleClear, className: 'btn-ghost' }, 'CLEAR')
    )
  )
}

// ─── Skills section ───────────────────────────────────────────────────────────

function SkillsSection({ skills, familyLabel }) {
  if (skills.length === 0) {
    return React.createElement('div', { className: 'skill-rows-empty' }, 'No skills match the current filter.')
  }

  return React.createElement(
    'div',
    { className: 'skill-rows' },
    ...skills.map(skill => {
      const phaseCount = skill.authoredPhases != null ? skill.authoredPhases : skill.phases

      return React.createElement(
        'a',
        { key: skill.name, className: 'skill-row', href: `/skills/${skill.name}` },
        React.createElement(
          'span',
          { className: 'sr-main' },
          React.createElement(
            'span',
            { className: 'sr-name' },
            skill.name,
            skill.live ? React.createElement('span', { className: 'sr-live' }, 'LIVE') : null
          ),
          React.createElement('span', { className: 'sr-desc' }, firstSentence(skill.description))
        ),
        React.createElement('span', { className: 'sr-family' }, familyLabel(skill.name)),
        React.createElement('span', { className: 'sr-phases' }, `${phaseCount} phase${phaseCount === 1 ? '' : 's'}`)
      )
    })
  )
}

// ─── Family selector ──────────────────────────────────────────────────────────

function FamilyBar({ families, counts, active, onSelect }) {
  const items = [{ key: 'all', label: 'All' }].concat(families)
  return React.createElement(
    'div',
    { className: 'family-bar', role: 'group', 'aria-label': 'Skill families' },
    ...items.map(f =>
      React.createElement(
        'button',
        {
          key: f.key,
          type: 'button',
          className: 'family-btn' + (active === f.key ? ' selected' : ''),
          'aria-pressed': active === f.key,
          onClick: () => onSelect(f.key)
        },
        f.label,
        React.createElement('span', { className: 'family-n' }, String(counts[f.key] || 0))
      )
    )
  )
}

// ─── Search field ─────────────────────────────────────────────────────────────

function SkillSearch({ value, onChange }) {
  return React.createElement(
    'div',
    { className: 'skill-search' },
    React.createElement(
      'svg',
      { width: '13', height: '13', viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
      React.createElement('circle', { cx: '7', cy: '7', r: '5', stroke: 'currentColor', strokeWidth: '1.4' }),
      React.createElement('path', { d: 'M11 11l4 4', stroke: 'currentColor', strokeWidth: '1.4', strokeLinecap: 'round' })
    ),
    React.createElement('input', {
      type: 'search',
      value,
      placeholder: 'Search skills, frameworks, techniques, environments…',
      'aria-label': 'Search skills',
      onChange: e => onChange(e.target.value),
      onKeyDown: e => { if (e.key === 'Escape') onChange('') }
    })
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function SkillsPage({ skills: initialSkills, families, familyByName }) {
  const [query, setQuery] = useState('')
  const [family, setFamily] = useState('all')
  const [recommendedSkills, setRecommendedSkills] = useState(null)
  const [recommendLoading, setRecommendLoading] = useState(false)

  const familyLabel = name => (families.find(f => f.key === familyByName[name]) || { label: '—' }).label

  // Family tallies come from the full library, not the filtered view, so the
  // numbers stay stable as a reference rather than shifting on every keystroke.
  const familyCounts = { all: initialSkills.length }
  for (const f of families) familyCounts[f.key] = 0
  for (const s of initialSkills) {
    const k = familyByName[s.name]
    familyCounts[k] = (familyCounts[k] || 0) + 1
  }

  function handleSelectFamily(key) {
    setFamily(key)
    setRecommendedSkills(null)
  }

  function handleQuery(value) {
    setQuery(value)
    setRecommendedSkills(null)
  }

  async function handleRecommend(skills) {
    setRecommendLoading(true)
    setQuery('')
    setFamily('all')
    setRecommendedSkills(skills)
    setRecommendLoading(false)
  }

  function handleClearRecommend() {
    setRecommendedSkills(null)
    setQuery('')
    setFamily('all')
  }

  const q = query.trim().toLowerCase()
  const displaySkills = recommendedSkills != null
    ? recommendedSkills
    : initialSkills.filter(s =>
      (family === 'all' || familyByName[s.name] === family) && matchesQuery(s, q)
    )

  return React.createElement(
    Layout,
    { title: 'Skills', description: 'Browse the Aegis cybersecurity skill pack by family.' },
    React.createElement(
      'div',
      { className: 'container', style: { paddingBottom: '120px' } },
      React.createElement(
        'div',
        { className: 'page-head' },
        React.createElement('div', { className: 'eyebrow' }, 'Aegis'),
        React.createElement('h1', null, 'Skills'),
        React.createElement('p', null, `${initialSkills.length} defensive security skills in ${families.length} families. Every skill is free to copy as a single-file prompt, download as a zip, install into your coding assistant, or read over MCP.`)
      ),
      React.createElement(RecommendForm, {
        onResults: handleRecommend,
        onClear: handleClearRecommend,
        loading: recommendLoading
      }),
      recommendedSkills == null
        ? React.createElement(SkillSearch, { value: query, onChange: handleQuery })
        : null,
      recommendedSkills == null
        ? React.createElement(FamilyBar, {
          families,
          counts: familyCounts,
          active: family,
          onSelect: handleSelectFamily
        })
        : null,
      React.createElement(
        'div',
        { className: 'list-meta' },
        React.createElement(
          'span',
          null,
          `${displaySkills.length} skill${displaySkills.length === 1 ? '' : 's'}` +
          `${displaySkills.filter(s => s.live).length > 0 ? ` · ${displaySkills.filter(s => s.live).length} live` : ''}`
        ),
        recommendedSkills != null
          ? React.createElement('span', { className: 'ranked' }, '↑ Ranked by relevance')
          : null
      ),
      React.createElement(SkillsSection, { skills: displaySkills, familyLabel })
    )
  )
}

async function getStaticProps () {
  const { listSkills } = require('../../lib/aegis')
  const { FAMILIES, familyOf } = require('../../lib/aegis')
  const skills = (await listSkills()).map(s => ({
    name: s.name,
    description: s.description || '',
    tags: s.tags || [],
    frameworks: s.frameworks || [],
    phases: s.phases ?? 0,
    authoredPhases: s.authoredPhases ?? s.phases ?? 0,
    live: !!s.live,
    context: s.context || null
  })).sort((a, b) => a.name.localeCompare(b.name))
  const familyByName = Object.fromEntries(skills.map(s => [s.name, familyOf(s.name)]))
  return { props: { skills, families: FAMILIES.map(f => ({ key: f.key, label: f.label })), familyByName } }
}

module.exports = { default: SkillsPage, getStaticProps }
module.exports.default = SkillsPage
