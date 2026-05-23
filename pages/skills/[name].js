'use strict'

const React = require('react')
const fs = require('fs').promises
const path = require('path')
const Layout = require('../../components/Layout')
const InstallTabs = require('../../components/InstallTabs')
const { listSkills, getSkillManifest } = require('../../lib/skill-reader')

function SkillDetailPage({ manifest, systemPrompt, openaiAction }) {
  const mcpUrl = `https://project-iud7o.vercel.app/api/${manifest.name}/manifest`
  const mcpConfig = JSON.stringify(
    { mcpServers: { [manifest.name]: { url: mcpUrl } } },
    null,
    2
  )

  return React.createElement(
    Layout,
    null,
    React.createElement(
      'div',
      { className: 'py-12' },
      // Header
      React.createElement(
        'div',
        { className: 'mb-10' },
        React.createElement(
          'div',
          { className: 'flex items-center gap-3 mb-3' },
          React.createElement(
            'h1',
            { className: 'text-3xl font-bold text-zinc-100 tracking-tight' },
            manifest.name
          ),
          React.createElement(
            'span',
            { className: 'text-xs font-mono px-2 py-1 rounded bg-zinc-800 text-zinc-400 border border-zinc-700' },
            `v${manifest.version}`
          )
        ),
        React.createElement(
          'p',
          { className: 'text-zinc-400 leading-relaxed max-w-2xl mb-4' },
          manifest.description
        ),
        // Tags + frameworks
        React.createElement(
          'div',
          { className: 'flex flex-wrap gap-2' },
          ...(manifest.tags || []).map(tag =>
            React.createElement(
              'span',
              { key: `tag-${tag}`, className: 'text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300' },
              tag
            )
          ),
          ...(manifest.frameworks || []).map(fw =>
            React.createElement(
              'span',
              { key: `fw-${fw}`, className: 'text-xs px-2 py-0.5 rounded bg-indigo-900/40 text-indigo-300 border border-indigo-800/50' },
              fw
            )
          )
        )
      ),
      // Phases
      React.createElement(
        'div',
        { className: 'mb-10' },
        React.createElement(
          'h2',
          { className: 'text-lg font-semibold text-zinc-100 mb-4' },
          'Phases'
        ),
        React.createElement(
          'ol',
          { className: 'space-y-2' },
          ...(manifest.phases || []).map((phase, i) =>
            React.createElement(
              'li',
              { key: phase.id, className: 'flex items-center gap-3 text-sm' },
              React.createElement(
                'span',
                { className: 'text-indigo-400 font-mono text-xs w-5 shrink-0' },
                String(i + 1).padStart(2, '0')
              ),
              React.createElement(
                'span',
                { className: 'text-zinc-100' },
                phase.id
              ),
              React.createElement(
                'span',
                { className: 'text-zinc-600 text-xs' },
                `${phase.tokens.toLocaleString()} tokens`
              )
            )
          )
        )
      ),
      // Install section
      React.createElement(
        'div',
        null,
        React.createElement(
          'h2',
          { className: 'text-lg font-semibold text-zinc-100 mb-4' },
          'Install'
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

module.exports = SkillDetailPage
module.exports.default = SkillDetailPage
module.exports.getStaticPaths = getStaticPaths
module.exports.getStaticProps = getStaticProps
