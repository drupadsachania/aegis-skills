'use strict'

const React = require('react')
const fs = require('fs').promises
const path = require('path')
const Layout = require('../../components/Layout')
const InstallTabs = require('../../components/InstallTabs')
const { listSkills, getSkillManifest } = require('../../lib/skill-reader')

function SkillDetailPage({ manifest, systemPrompt, openaiAction }) {
  const mcpUrl = `https://aegis-skills.vercel.app/api/${manifest.name}/manifest`
  const mcpConfig = JSON.stringify(
    { mcpServers: { [manifest.name]: { url: mcpUrl } } },
    null,
    2
  )

  const tagList = [
    ...(manifest.tags || []).map(t =>
      React.createElement('span', { key: `tag-${t}`, className: 'tag-pill' }, t)
    ),
    ...(manifest.frameworks || []).map(f =>
      React.createElement('span', { key: `fw-${f}`, className: 'tag-pill purple' }, f)
    )
  ]

  return React.createElement(
    Layout,
    null,
    React.createElement(
      'div',
      { className: 'container', style: { paddingTop: '80px', paddingBottom: '120px' } },

      // ── Doc meta bar ────────────────────────────────────────────────────────
      React.createElement(
        'div',
        { className: 'hero-meta', style: { marginBottom: '32px' } },
        React.createElement('span', { className: 'dot' }),
        React.createElement('span', { className: 'sep' }),
        'SKILL',
        React.createElement('span', { className: 'sep' }),
        manifest.name,
        React.createElement('span', { className: 'sep' }),
        React.createElement(
          'span',
          {
            style: {
              fontFamily: 'var(--f-mono)',
              fontSize: '10px',
              color: 'var(--bg)',
              background: 'var(--gold)',
              padding: '1px 8px',
              letterSpacing: '0.06em'
            }
          },
          `v${manifest.version}`
        )
      ),

      // ── Title ───────────────────────────────────────────────────────────────
      React.createElement(
        'h1',
        {
          style: {
            fontFamily: 'var(--f-display)',
            fontWeight: 400,
            fontSize: 'clamp(48px, 6vw, 80px)',
            lineHeight: 1.0,
            letterSpacing: '-0.02em',
            color: 'var(--cream)',
            marginBottom: '16px'
          }
        },
        manifest.name
      ),

      // ── Description ─────────────────────────────────────────────────────────
      React.createElement(
        'p',
        {
          style: {
            fontFamily: 'var(--f-sans)',
            fontSize: '17px',
            color: 'var(--cream-dim)',
            maxWidth: '660px',
            lineHeight: 1.65,
            fontWeight: 300,
            paddingBottom: '48px',
            borderBottom: '1px solid var(--border-dim)',
            marginBottom: '64px'
          }
        },
        manifest.description
      ),

      // ── Tags & frameworks ────────────────────────────────────────────────────
      tagList.length > 0
        ? React.createElement(
            'div',
            { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '64px', marginTop: '-40px' } },
            ...tagList
          )
        : null,

      // ── Phases — lifecycle steps ─────────────────────────────────────────────
      React.createElement(
        'div',
        { style: { marginBottom: '72px' } },
        // Section header
        React.createElement(
          'div',
          { style: { display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '24px' } },
          React.createElement('span', { className: 'ds-num' }, '01'),
          React.createElement(
            'h2',
            {
              style: {
                fontFamily: 'var(--f-display)',
                fontWeight: 400,
                fontSize: '28px',
                letterSpacing: '-0.015em',
                color: 'var(--cream)',
                lineHeight: 1.1
              }
            },
            'Phases'
          )
        ),
        React.createElement(
          'p',
          { style: { fontSize: '14px', color: 'var(--muted)', marginBottom: '20px', maxWidth: '560px', lineHeight: 1.7 } },
          `This skill has ${(manifest.phases || []).length} phase${(manifest.phases || []).length === 1 ? '' : 's'}. Each phase represents a distinct analysis step with its own context window.`
        ),
        React.createElement(
          'div',
          { className: 'lifecycle' },
          ...(manifest.phases || []).map((phase, i) =>
            React.createElement(
              'div',
              { key: phase.id, className: 'lifecycle-step' },
              React.createElement('span', { className: 'lifecycle-num' }, String(i + 1).padStart(2, '0')),
              React.createElement('span', { className: 'lifecycle-name' }, phase.id),
              React.createElement('span', { className: 'lifecycle-tokens' }, `${phase.tokens != null ? phase.tokens.toLocaleString() : '—'} tokens`)
            )
          )
        )
      ),

      // ── Install ───────────────────────────────────────────────────────────────
      React.createElement(
        'div',
        null,
        // Section header
        React.createElement(
          'div',
          { style: { display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '24px' } },
          React.createElement('span', { className: 'ds-num' }, '02'),
          React.createElement(
            'h2',
            {
              style: {
                fontFamily: 'var(--f-display)',
                fontWeight: 400,
                fontSize: '28px',
                letterSpacing: '-0.015em',
                color: 'var(--cream)',
                lineHeight: 1.1
              }
            },
            'Install'
          )
        ),
        React.createElement(
          'p',
          { style: { fontSize: '14px', color: 'var(--muted)', marginBottom: '20px', maxWidth: '560px', lineHeight: 1.7 } },
          'Choose your deployment target. The same skill source compiles to each format — paste or wire whichever fits your platform.'
        ),
        React.createElement(InstallTabs, {
          name: manifest.name,
          systemPrompt,
          openaiAction,
          mcpUrl,
          mcpConfig
        })
      )
    )
  )
}

async function getStaticPaths() {
  const skills = await listSkills()
  return {
    paths: skills.map(s => ({ params: { name: s.name } })),
    fallback: false
  }
}

async function getStaticProps({ params }) {
  const { name } = params
  const manifest = await getSkillManifest(name)
  if (!manifest) return { notFound: true }

  const skillDir = path.join(process.cwd(), 'skills', name, 'artifacts')

  let systemPrompt = ''
  let openaiAction = ''

  try {
    systemPrompt = await fs.readFile(path.join(skillDir, 'system-prompt.txt'), 'utf8')
  } catch (_) { systemPrompt = '' }

  try {
    openaiAction = await fs.readFile(path.join(skillDir, 'openai-action.json'), 'utf8')
  } catch (_) { openaiAction = '' }

  return {
    props: { manifest, systemPrompt, openaiAction }
  }
}

const pageExports = { default: SkillDetailPage, getStaticPaths, getStaticProps }
module.exports = pageExports
module.exports.default = SkillDetailPage
