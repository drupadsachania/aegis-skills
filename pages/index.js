'use strict'

const React = require('react')
const { useState } = React
const Layout = require('../components/Layout')
const PlatformBadge = require('../components/PlatformBadge')
const { listSkills } = require('../lib/skill-reader')
const { FAMILIES, familyOf, labelOf } = require('../lib/skill-families')

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

const INTEL_STEPS = [
  {
    n: '01',
    label: 'Ingest',
    desc: 'Pull the window\'s feeds, knowledge graph, and teardowns. Tier each source and deduplicate against prior runs.'
  },
  {
    n: '02',
    label: 'Extract',
    desc: 'Turn individual incidents into reusable attack patterns and map them across the full ATT&CK chain.'
  },
  {
    n: '03',
    label: 'Route',
    desc: 'Send each pattern to the skills whose attack surface it lands on — by technology and domain, not headline.'
  },
  {
    n: '04',
    label: 'Map coverage',
    desc: 'Derive coverage prompts: recurring CVEs, dominant techniques, and where telemetry may not even exist.'
  }
]

const COMMANDS = [
  {
    cmd: 'aegis list',
    desc: 'Show installed skills and their status for each tool.'
  },
  {
    cmd: 'aegis configure --for <tool>',
    desc: 'Reconfigure a specific tool (claude, chatgpt, cursor, gemini, vscode, antigravity-cli).'
  },
  {
    cmd: 'aegis compile [skill]',
    desc: 'Rebuild artifacts from SKILL.md — system prompt, MCP manifest, and OpenAI action schema.'
  },
  {
    cmd: 'aegis intel-sync',
    desc: 'Ingest a threat-intel corpus, route findings into the skills they affect, and recompile.'
  }
]

const COMMON_ENVIRONMENTS = ['enterprise', 'cloud', 'hybrid', 'ot', 'remote-workforce', 'saas']
const COMMON_TAGS = ['network', 'endpoint', 'web-application', 'api', 'lateral-movement', 'credential-theft', 'supply-chain', 'detection', 'compliance']

// ─── helpers ─────────────────────────────────────────────────────────────────

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

function SkillsSection({ skills }) {
  if (skills.length === 0) {
    return React.createElement('div', { className: 'skill-rows-empty' }, 'No skills match the current filter.')
  }

  return React.createElement(
    'div',
    { className: 'skill-rows' },
    ...skills.map(skill => {
      const pct = skill.healthScore != null ? Math.round(skill.healthScore * 100) : null
      // Scores cluster between 0.85 and 1.00, so map that band across the bar's full
      // width — a raw 0-100 fill renders every skill as a near-identical stripe.
      const fill = pct != null
        ? Math.max(6, Math.min(100, Math.round(((skill.healthScore - 0.85) / 0.15) * 100)))
        : 0
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
        React.createElement('span', { className: 'sr-family' }, labelOf(familyOf(skill.name))),
        React.createElement('span', { className: 'sr-phases' }, `${phaseCount} phase${phaseCount === 1 ? '' : 's'}`),
        React.createElement(
          'span',
          { className: 'sr-health' },
          pct != null
            ? React.createElement(
              'span',
              { className: 'pct-bar' },
              React.createElement(
                'span',
                { className: 'pct-track' },
                React.createElement('span', { className: 'pct-fill', style: { width: `${fill}%` } })
              ),
              React.createElement('span', { className: 'pct-num' }, String(pct))
            )
            : React.createElement('span', { className: 'pct-num', style: { color: 'var(--faint)' } }, '—')
        )
      )
    })
  )
}

// ─── Family selector ──────────────────────────────────────────────────────────

function FamilyBar({ counts, active, onSelect }) {
  const items = [{ key: 'all', label: 'All' }].concat(FAMILIES)
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

function HomePage({ skills: initialSkills }) {
  const [query, setQuery] = useState('')
  const [family, setFamily] = useState('all')
  const [recommendedSkills, setRecommendedSkills] = useState(null)
  const [recommendLoading, setRecommendLoading] = useState(false)

  // Family tallies come from the full library, not the filtered view, so the
  // numbers stay stable as a reference rather than shifting on every keystroke.
  const familyCounts = { all: initialSkills.length }
  for (const f of FAMILIES) familyCounts[f.key] = 0
  for (const s of initialSkills) {
    const k = familyOf(s.name)
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
      (family === 'all' || familyOf(s.name) === family) && matchesQuery(s, q)
    )

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

          // ── Universal Installation ──
          React.createElement(
            'div',
            { style: { marginBottom: '50px' } },
            React.createElement('h3', { style: { fontSize: '18px', marginBottom: '20px', color: 'var(--cream)' } }, 'Universal Installation'),
            React.createElement('p', { style: { color: 'var(--cream-dim)', marginBottom: '20px' } },
              'Install once globally, use with Claude, ChatGPT, Cursor, Gemini, VS Code, or Antigravity CLI.'
            ),
            React.createElement(
              'div',
              { style: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px', fontFamily: 'var(--f-mono)', fontSize: '13px', color: 'var(--cream)', overflowX: 'auto', marginBottom: '20px' } },
              React.createElement('div', null, 'npm install -g @aegis-skills/core'),
              React.createElement('div', { style: { marginTop: '10px' } }, 'aegis init')
            ),
            React.createElement('p', { style: { color: 'var(--cream-dim)', fontSize: '13px' } },
              React.createElement('code', { style: { background: 'var(--bg)', padding: '2px 6px', borderRadius: '4px' } }, 'aegis init'),
              ' will:'
            ),
            React.createElement(
              'ul',
              { style: { color: 'var(--cream-dim)', fontSize: '13px', marginLeft: '20px', marginTop: '10px' } },
              React.createElement('li', null, 'Detect your installed tools (Claude, ChatGPT, Cursor, Gemini, VS Code, Antigravity)'),
              React.createElement('li', null, 'Interactively select which tools to configure'),
              React.createElement('li', null, 'Inject skill manifests and system prompts to each tool'),
              React.createElement('li', null,
                'Save configuration to ',
                React.createElement('code', { style: { background: 'var(--bg)', padding: '2px 4px' } }, '~/.aegisrc')
              )
            )
          ),

          // ── Post-Install Commands ──
          React.createElement(
            'div',
            null,
            React.createElement('h3', { style: { fontSize: '18px', marginBottom: '20px', color: 'var(--cream)' } }, 'Available Commands'),
            React.createElement(
              'div',
              { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' } },
              ...COMMANDS.map(cmd =>
                React.createElement(
                  'div',
                  { key: cmd.cmd, style: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px' } },
                  React.createElement('div', { style: { fontFamily: 'var(--f-mono)', color: 'var(--cream)', marginBottom: '10px', fontSize: '13px' } }, cmd.cmd),
                  React.createElement('p', { style: { color: 'var(--cream-dim)', fontSize: '13px', margin: 0 } }, cmd.desc)
                )
              )
            )
          ),

          // ── Audit API ──
          React.createElement(
            'div',
            { style: { marginTop: '40px' } },
            React.createElement('h3', { style: { fontSize: '18px', marginBottom: '16px', color: 'var(--cream)' } }, 'Audit API'),
            React.createElement('p', { style: { color: 'var(--cream-dim)', marginBottom: '16px', fontSize: '14px' } },
              'POST to /api/audit to run a standards-based security audit against CIS, NIST CSF, ISO 27001, SOC 2, PCI-DSS, HIPAA, IEC 62443, or NIST 800-53.'
            ),
            React.createElement(
              'div',
              { style: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px', fontFamily: 'var(--f-mono)', fontSize: '12px', color: 'var(--cream)', overflowX: 'auto' } },
              React.createElement('div', null, 'POST /api/audit'),
              React.createElement('div', { style: { color: 'var(--cream-dim)', marginTop: '8px' } }, '{ "input": "<config or policy text>",'),
              React.createElement('div', { style: { color: 'var(--cream-dim)' } }, '  "inputType": "config",'),
              React.createElement('div', { style: { color: 'var(--cream-dim)' } }, '  "standards": ["cis-l1", "nist-csf"] }')
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
          // Search
          recommendedSkills == null
            ? React.createElement(SkillSearch, { value: query, onChange: handleQuery })
            : null,
          // Families
          recommendedSkills == null
            ? React.createElement(FamilyBar, {
              counts: familyCounts,
              active: family,
              onSelect: handleSelectFamily
            })
            : null,
          // Count + relevance note
          React.createElement(
            'div',
            { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '14px 0 4px' } },
            React.createElement(
              'span',
              { style: { fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--faint)', letterSpacing: '0.08em' } },
              `${displaySkills.length} skill${displaySkills.length === 1 ? '' : 's'}` +
              `${displaySkills.filter(s => s.live).length > 0 ? ` · ${displaySkills.filter(s => s.live).length} live` : ''}`
            ),
            recommendedSkills != null
              ? React.createElement('span', { style: { fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gold)', letterSpacing: '0.1em' } }, '↑ RANKED BY RELEVANCE')
              : null
          ),
          // Rows
          React.createElement(SkillsSection, { skills: displaySkills })
        )
      )
    ),

    // ── Self-updating intel loop ──────────────────────────────────────────────
    React.createElement(
      'div',
      { id: 'intel', style: { position: 'relative', zIndex: 1, borderTop: '1px solid var(--border-dim)' } },
      React.createElement(
        'div',
        { className: 'container' },
        React.createElement(
          'div',
          { className: 'section' },
          React.createElement(
            'div',
            { className: 'sec-head' },
            React.createElement('span', { className: 'sec-num' }, '05'),
            React.createElement('span', { className: 'sec-kicker' }, 'Self-Updating Intel')
          ),
          React.createElement(
            'p',
            { style: { color: 'var(--cream-dim)', maxWidth: '760px', marginBottom: '32px' } },
            'Skills go stale as the threat landscape moves. ',
            React.createElement('code', { style: { background: 'var(--bg)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'var(--f-mono)', fontSize: '13px' } }, 'aegis intel-sync'),
            ' ingests a threat-intelligence corpus — news feeds, knowledge graphs, and incident teardowns — extracts the reusable attack patterns, and routes each one into the skills whose attack surface it actually lands on.'
          ),
          React.createElement(
            'div',
            { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' } },
            ...INTEL_STEPS.map(step =>
              React.createElement(
                'div',
                { key: step.n, className: 'step-cell' },
                React.createElement('span', { className: 'step-num' }, step.n),
                React.createElement('h3', null, step.label),
                React.createElement('p', null, step.desc)
              )
            )
          ),
          React.createElement(
            'div',
            { style: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px', fontFamily: 'var(--f-mono)', fontSize: '12px', color: 'var(--cream)', overflowX: 'auto' } },
            React.createElement('div', null, '$ aegis intel-sync --days 7'),
            React.createElement('div', { style: { color: 'var(--cream-dim)', marginTop: '8px' } }, '  corpus: 199 article(s) · 2 teardown(s) · graph 323 nodes'),
            React.createElement('div', { style: { color: 'var(--cream-dim)' } }, '  routed to 19 skill(s) · coverage prompts written'),
            React.createElement('div', { style: { color: 'var(--gold)', marginTop: '8px' } }, '  ✓ intel blocks written · artifacts recompiled')
          ),
          React.createElement(
            'p',
            { style: { color: 'var(--faint)', fontSize: '12px', marginTop: '16px', maxWidth: '760px' } },
            'Generated intel is confined to its own reference file between explicit markers — hand-authored tradecraft is never modified, and every block is fully regenerable. Auto-generated phases are excluded from health scoring so a live feed can never inflate a skill\'s score.'
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
