'use strict'

const React = require('react')
const { useState } = React
const Layout = require('../components/Layout')
const SkillCard = require('../components/SkillCard')
const PlatformBadge = require('../components/PlatformBadge')
const { listSkills } = require('../lib/skill-reader')

const PLATFORMS = ['chatgpt', 'claude', 'cursor', 'gemini']

const STEPS = [
  {
    n: '01',
    label: 'Write SKILL.md',
    desc: 'Author your skill in a single markdown bundle — metadata, phases, and guidance in one file.'
  },
  {
    n: '02',
    label: 'Compile artifacts',
    desc: 'Run aegis compile — generates a system prompt, OpenAI action schema, and MCP manifest.'
  },
  {
    n: '03',
    label: 'Deploy anywhere',
    desc: 'Push to Vercel. Paste the system prompt or wire the MCP endpoint — done in minutes.'
  }
]

const COMMON_ENVIRONMENTS = ['enterprise', 'cloud', 'hybrid', 'ot', 'remote-workforce', 'saas']
const COMMON_TAGS = ['network', 'endpoint', 'web-application', 'api', 'lateral-movement', 'credential-theft', 'supply-chain', 'detection', 'compliance']

// ─── helpers ─────────────────────────────────────────────────────────────────

function getFilterOptions(skills) {
  const tags = new Set()
  const envs = new Set()
  for (const skill of skills) {
    for (const t of (skill.tags || [])) tags.add(t)
    for (const e of (((skill.context) || {}).environments || [])) envs.add(e)
  }
  return { tags: [...tags].sort(), environments: [...envs].sort() }
}

function applyTagFilter(skills, selectedTags) {
  if (selectedTags.size === 0) return skills
  return skills.filter(skill =>
    [...selectedTags].every(t =>
      (skill.tags || []).includes(t) ||
      (((skill.context) || {}).environments || []).includes(t)
    )
  )
}

// ─── Filter sidebar ───────────────────────────────────────────────────────────

function FilterSidebar({ options, selectedTags, onToggle }) {
  if (options.tags.length === 0 && options.environments.length === 0) return null

  function ConceptItem({ value }) {
    const checked = selectedTags.has(value)
    return React.createElement(
      'label',
      { className: 'concept-row', onClick: () => onToggle(value) },
      React.createElement('input', {
        type: 'checkbox',
        checked,
        onChange: () => onToggle(value),
        className: 'concept-check',
        onClick: e => e.stopPropagation()
      }),
      React.createElement(
        'span',
        { className: ['concept-label', checked ? 'checked' : ''].join(' ').trim() },
        value
      )
    )
  }

  return React.createElement(
    'aside',
    { className: 'filter-sidebar' },
    React.createElement('span', { className: 'filter-head' }, 'Filter'),
    options.environments.length > 0
      ? React.createElement(
          'div',
          null,
          React.createElement('span', { className: 'filter-section-label' }, 'Environments'),
          React.createElement(
            'div',
            { className: 'concept-list' },
            ...options.environments.map(e => React.createElement(ConceptItem, { key: e, value: e }))
          )
        )
      : null,
    options.tags.length > 0
      ? React.createElement(
          'div',
          { style: { marginTop: '16px' } },
          React.createElement('span', { className: 'filter-section-label' }, 'Tags'),
          React.createElement(
            'div',
            { className: 'concept-list' },
            ...options.tags.map(t => React.createElement(ConceptItem, { key: t, value: t }))
          )
        )
      : null,
    selectedTags.size > 0
      ? React.createElement(
          'button',
          { className: 'filter-clear', onClick: () => [...selectedTags].forEach(t => onToggle(t)) },
          'Clear filters'
        )
      : null
  )
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
    error ? React.createElement('p', { style: { color: 'var(--gold-warm)', fontFamily: 'var(--f-mono)', fontSize: '11px', marginTop: '8px' } }, error) : null,
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

function SkillsSection({ skills, recommendedSkills }) {
  return React.createElement(
    'div',
    { style: { overflowX: 'auto' } },
    React.createElement(
      'table',
      { className: 'skills-table' },
      React.createElement(
        'thead',
        null,
        React.createElement(
          'tr',
          null,
          React.createElement('th', null, 'Name'),
          React.createElement('th', null, 'Description'),
          React.createElement('th', null, 'Tags'),
          React.createElement('th', null, 'Phases'),
          React.createElement('th', null, recommendedSkills != null ? 'Relevance' : 'Health')
        )
      ),
      React.createElement(
        'tbody',
        null,
        skills.length === 0
          ? React.createElement(
              'tr',
              null,
              React.createElement(
                'td',
                { colSpan: 5, style: { color: 'var(--faint)', fontFamily: 'var(--f-mono)', fontSize: '12px', textAlign: 'center', padding: '32px' } },
                'No skills match the current filter.'
              )
            )
          : skills.map(skill =>
              React.createElement(SkillCard, {
                key: skill.name,
                skill,
                healthScore: skill.healthScore != null ? skill.healthScore : null
              })
            )
      )
    )
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function HomePage({ skills: initialSkills }) {
  const [selectedTags, setSelectedTags] = useState(new Set())
  const [recommendedSkills, setRecommendedSkills] = useState(null)
  const [recommendLoading, setRecommendLoading] = useState(false)

  const filterOptions = getFilterOptions(initialSkills)

  function toggleTag(tag) {
    setSelectedTags(prev => {
      const next = new Set(prev)
      next.has(tag) ? next.delete(tag) : next.add(tag)
      return next
    })
    setRecommendedSkills(null)
  }

  async function handleRecommend(skills) {
    setRecommendLoading(true)
    setSelectedTags(new Set())
    setRecommendedSkills(skills)
    setRecommendLoading(false)
  }

  function handleClearRecommend() {
    setRecommendedSkills(null)
    setSelectedTags(new Set())
  }

  const displaySkills = recommendedSkills != null
    ? recommendedSkills
    : applyTagFilter(initialSkills, selectedTags)

  return React.createElement(
    Layout,
    null,

    // ── Hero ──────────────────────────────────────────────────────────────────
    React.createElement(
      'div',
      { className: 'section' },
      React.createElement(
        'div',
        { className: 'container' },
        // Animated status dot + label
        React.createElement(
          'div',
          { className: 'hero-meta' },
          React.createElement('span', { className: 'dot' }),
          React.createElement('span', { className: 'sep' }),
          'AEGIS',
          React.createElement('span', { className: 'sep' }),
          'Defensive AI Skills'
        ),
        // Display heading
        React.createElement(
          'h1',
          { className: 'hero-h1' },
          'Skills built for',
          React.createElement('br'),
          React.createElement('em', null, 'defenders'),
          '.'
        ),
        // One-liner description
        React.createElement(
          'p',
          { className: 'hero-desc' },
          'Write once in ',
          React.createElement('strong', null, 'SKILL.md'),
          ' — Aegis compiles it to every platform format. System prompts, ChatGPT Actions, MCP endpoints. Deploy to ',
          React.createElement('strong', null, 'Claude, Gemini, Cursor'),
          ' and any MCP-compatible tool without changing the source.'
        ),
        // Platform badges row
        React.createElement(
          'div',
          { style: { display: 'flex', gap: '8px', marginTop: '28px', flexWrap: 'wrap' } },
          ...PLATFORMS.map(p => React.createElement(PlatformBadge, { key: p, platform: p }))
        )
      )
    ),

    // ── Twin cards — Aegis / Themis ────────────────────────────────────────────
    React.createElement(
      'div',
      { style: { position: 'relative', zIndex: 1 } },
      React.createElement(
        'div',
        { className: 'container' },
        React.createElement(
          'div',
          { className: 'section' },
          React.createElement(
            'div',
            { className: 'sec-head' },
            React.createElement('span', { className: 'sec-num' }, '01'),
            React.createElement('span', { className: 'sec-kicker' }, 'The Platform')
          ),
          React.createElement(
            'div',
            { className: 'twin' },
            // Aegis card
            React.createElement(
              'div',
              { className: 'twin-card aegis' },
              React.createElement(
                'div',
                { className: 'twin-tag' },
                React.createElement('span', { className: 'marker' }),
                'AEGIS'
              ),
              React.createElement('h3', null, 'Aegis'),
              React.createElement('div', { className: 'role' }, 'Skill compiler · Marketplace · API'),
              React.createElement(
                'p',
                null,
                'Author defensive security skills in a portable SKILL.md format. One source compiles to system prompts, ChatGPT Actions, and MCP server manifests — deploy to any AI platform without rewriting.'
              ),
              React.createElement('a', { href: '#skills', className: 'twin-link' }, 'Browse skills library', '→')
            ),
            // Themis card
            React.createElement(
              'div',
              { className: 'twin-card themis' },
              React.createElement(
                'div',
                { className: 'twin-tag' },
                React.createElement('span', { className: 'marker' }),
                'THEMIS'
              ),
              React.createElement('h3', null, 'Themis'),
              React.createElement('div', { className: 'role' }, 'LangGraph orchestrator · Multi-agent analysis'),
              React.createElement(
                'p',
                null,
                'An AI-powered threat analysis engine. Decompose a security task, fan out to specialist skill agents in parallel, apply guardrails to every output, and synthesise a structured findings report.'
              ),
              React.createElement('a', { href: '/themis', className: 'twin-link' }, 'Learn More', '→')
            )
          )
        )
      )
    ),

    // ── Getting Started ──────────────────────────────────────────────────────
    React.createElement(
      'div',
      { style: { position: 'relative', zIndex: 1, borderTop: '1px solid var(--border-dim)' } },
      React.createElement(
        'div',
        { className: 'container' },
        React.createElement(
          'div',
          { className: 'section' },
          React.createElement(
            'div',
            { className: 'sec-head' },
            React.createElement('span', { className: 'sec-num' }, '02'),
            React.createElement('span', { className: 'sec-kicker' }, 'Getting Started')
          ),
          React.createElement('p', null,
            'Install Aegis skills in your favorite AI platform or download as a standalone package.'
          ),

          // Two-column layout for installation methods
          React.createElement(
            'div',
            { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginTop: '32px' } },
            // ── Agent Installation ──
            React.createElement(
              'div',
              null,
              React.createElement('h3', { style: { fontSize: '16px', marginBottom: '16px', color: 'var(--cream)' } }, 'Install in Your Agent'),
              React.createElement('p', { style: { fontSize: '13px', color: 'var(--cream-dim)', marginBottom: '16px' } },
                'Add Aegis skills to ChatGPT, Claude, Cursor, or Gemini in seconds.'
              ),

              // ChatGPT
              React.createElement(
                'div',
                { style: { marginBottom: '20px' } },
                React.createElement('span', { style: { fontSize: '12px', fontWeight: '500', color: 'var(--gold)' } }, 'ChatGPT'),
                React.createElement('div', { className: 'code-block', style: { marginTop: '8px' } },
                  React.createElement('div', { className: 'code-body', style: { fontSize: '11px', fontFamily: 'var(--f-mono)', padding: '8px', color: 'var(--cream-dim)' } },
                    '1. Go to ChatGPT → Custom GPTs → Actions\n2. Paste this URL:\nhttps://aegis-skills.vercel.app/api/[skill]/manifest\n3. Select a skill (e.g., deception-engineering)\n4. Set authentication to None'
                  )
                )
              ),

              // Claude
              React.createElement(
                'div',
                { style: { marginBottom: '20px' } },
                React.createElement('span', { style: { fontSize: '12px', fontWeight: '500', color: 'var(--gold)' } }, 'Claude'),
                React.createElement('div', { className: 'code-block', style: { marginTop: '8px' } },
                  React.createElement('div', { className: 'code-body', style: { fontSize: '11px', fontFamily: 'var(--f-mono)', padding: '8px', color: 'var(--cream-dim)' } },
                    'Paste any system prompt from a skill detail page into your Claude conversation.'
                  )
                )
              ),

              // Cursor / Gemini
              React.createElement(
                'div',
                { style: { marginBottom: '20px' } },
                React.createElement('span', { style: { fontSize: '12px', fontWeight: '500', color: 'var(--gold)' } }, 'Cursor / Gemini'),
                React.createElement('div', { className: 'code-block', style: { marginTop: '8px' } },
                  React.createElement('div', { className: 'code-body', style: { fontSize: '11px', fontFamily: 'var(--f-mono)', padding: '8px', color: 'var(--cream-dim)' } },
                    'Copy system prompt from skill page → Paste in agent settings'
                  )
                )
              ),

              React.createElement('a', { href: '/docs', style: { fontSize: '12px', color: 'var(--accent)', textDecoration: 'underline', marginTop: '12px', display: 'inline-block' } }, 'Full installation guide →')
            ),

            // ── Package Installation ──
            React.createElement(
              'div',
              null,
              React.createElement('h3', { style: { fontSize: '16px', marginBottom: '16px', color: 'var(--cream)' } }, 'Install as Package'),
              React.createElement('p', { style: { fontSize: '13px', color: 'var(--cream-dim)', marginBottom: '16px' } },
                'Use Aegis skills in your own application or service.'
              ),

              // NPM
              React.createElement(
                'div',
                { style: { marginBottom: '20px' } },
                React.createElement('span', { style: { fontSize: '12px', fontWeight: '500', color: 'var(--gold)' } }, 'NPM Package'),
                React.createElement('div', { className: 'code-block', style: { marginTop: '8px' } },
                  React.createElement('div', { className: 'code-body', style: { fontSize: '11px', fontFamily: 'var(--f-mono)', padding: '8px', color: 'var(--cream-dim)' } },
                    'npm install @aegis-skills/[skill-name]'
                  )
                )
              ),

              // Docker
              React.createElement(
                'div',
                { style: { marginBottom: '20px' } },
                React.createElement('span', { style: { fontSize: '12px', fontWeight: '500', color: 'var(--gold)' } }, 'Docker Container'),
                React.createElement('div', { className: 'code-block', style: { marginTop: '8px' } },
                  React.createElement('div', { className: 'code-body', style: { fontSize: '11px', fontFamily: 'var(--f-mono)', padding: '8px', color: 'var(--cream-dim)' } },
                    'docker pull aegis-skills/[skill-name]\ndocker run -e API_KEY=... [image]'
                  )
                )
              ),

              // Git Clone
              React.createElement(
                'div',
                { style: { marginBottom: '20px' } },
                React.createElement('span', { style: { fontSize: '12px', fontWeight: '500', color: 'var(--gold)' } }, 'Git Clone'),
                React.createElement('div', { className: 'code-block', style: { marginTop: '8px' } },
                  React.createElement('div', { className: 'code-body', style: { fontSize: '11px', fontFamily: 'var(--f-mono)', padding: '8px', color: 'var(--cream-dim)' } },
                    'git clone https://github.com/drupadsachania/aegis-skills.git\nnpm install && npm run build'
                  )
                )
              ),

              React.createElement('a', { href: '/themis', style: { fontSize: '12px', color: 'var(--accent)', textDecoration: 'underline', marginTop: '12px', display: 'inline-block' } }, 'Deployment guide →')
            )
          )
        )
      )
    ),

    // ── How it works ─────────────────────────────────────────────────────────
    React.createElement(
      'div',
      { style: { position: 'relative', zIndex: 1, borderTop: '1px solid var(--border-dim)' } },
      React.createElement(
        'div',
        { className: 'container' },
        React.createElement(
          'div',
          { className: 'section' },
          React.createElement(
            'div',
            { className: 'sec-head' },
            React.createElement('span', { className: 'sec-num' }, '03'),
            React.createElement('span', { className: 'sec-kicker' }, 'How it works')
          ),
          React.createElement(
            'div',
            { className: 'steps-grid' },
            ...STEPS.map(step =>
              React.createElement(
                'div',
                { key: step.n, className: 'step-cell' },
                React.createElement('span', { className: 'step-num' }, step.n),
                React.createElement('h3', null, step.label),
                React.createElement('p', null, step.desc)
              )
            )
          )
        )
      )
    ),

    // ── Skills library ────────────────────────────────────────────────────────
    React.createElement(
      'div',
      { id: 'skills', style: { position: 'relative', zIndex: 1, borderTop: '1px solid var(--border-dim)' } },
      React.createElement(
        'div',
        { className: 'container' },
        React.createElement(
          'div',
          { className: 'section' },
          React.createElement(
            'div',
            { className: 'sec-head' },
            React.createElement('span', { className: 'sec-num' }, '04'),
            React.createElement('span', { className: 'sec-kicker' }, 'Skills Library')
          ),
          // Recommend form
          React.createElement(RecommendForm, {
            onResults: handleRecommend,
            onClear: handleClearRecommend,
            loading: recommendLoading
          }),
          // Count + relevance note
          React.createElement(
            'div',
            { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' } },
            React.createElement(
              'span',
              { style: { fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--faint)', letterSpacing: '0.08em' } },
              `${displaySkills.length} skill${displaySkills.length === 1 ? '' : 's'}${selectedTags.size > 0 ? ' · filtered' : ''}`
            ),
            recommendedSkills != null
              ? React.createElement('span', { style: { fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gold)', letterSpacing: '0.1em' } }, '↑ RANKED BY RELEVANCE')
              : null
          ),
          // Table + sidebar layout
          React.createElement(
            'div',
            { style: { display: 'flex', gap: '40px', alignItems: 'flex-start' } },
            React.createElement(FilterSidebar, {
              options: filterOptions,
              selectedTags,
              onToggle: toggleTag
            }),
            React.createElement(
              'div',
              { style: { flex: 1, minWidth: 0 } },
              React.createElement(SkillsSection, { skills: displaySkills, recommendedSkills })
            )
          )
        )
      )
    )
  )
}

async function getStaticProps() {
  const fs = require('fs')
  const path = require('path')
  const skills = await listSkills()

  // Load health scores and merge into skills
  let healthScores = {}
  try {
    const healthPath = path.join(process.cwd(), 'health.json')
    if (fs.existsSync(healthPath)) {
      const healthContent = fs.readFileSync(healthPath, 'utf8')
      const healthData = JSON.parse(healthContent)
      healthScores = (healthData && healthData.skills) || {}
    }
  } catch (err) {
    console.warn('Health scores not available:', err.message)
    // Continue without scores if health.json cannot be loaded
  }

  // Merge health scores into skills
  const skillsWithHealth = skills.map(skill => {
    const score = healthScores[skill.name]?.['health-score']
    return {
      ...skill,
      healthScore: typeof score === 'number' ? score : null
    }
  })

  return {
    props: { skills: skillsWithHealth },
    revalidate: 3600 // Revalidate every hour
  }
}

const pageExports = { default: HomePage, getStaticProps }
module.exports = pageExports
module.exports.default = HomePage
