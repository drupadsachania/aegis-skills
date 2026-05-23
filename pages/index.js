'use strict'

const React = require('react')
const Layout = require('../components/Layout')
const SkillCard = require('../components/SkillCard')
const PlatformBadge = require('../components/PlatformBadge')
const { listSkills } = require('../lib/skill-reader')

const PLATFORMS = ['chatgpt', 'claude', 'cursor', 'gemini']

const STEPS = [
  { n: '01', label: 'Write SKILL.md', desc: 'Author your skill in a single markdown bundle with phases and metadata.' },
  { n: '02', label: 'Compile artifacts', desc: 'Run openskill compile — generates system prompt, OpenAI action, and MCP manifest.' },
  { n: '03', label: 'Deploy anywhere', desc: 'Push to Vercel. Paste the system prompt or wire the MCP endpoint — done.' }
]

function HomePage({ skills }) {
  return React.createElement(
    Layout,
    null,
    // Hero
    React.createElement(
      'section',
      { className: 'py-20 text-center' },
      React.createElement(
        'h1',
        { className: 'text-4xl font-bold text-zinc-100 mb-4 tracking-tight' },
        'Platform-agnostic AI skills.',
        React.createElement('br'),
        React.createElement('span', { className: 'text-indigo-400' }, 'Write once, deploy anywhere.')
      ),
      React.createElement(
        'p',
        { className: 'text-zinc-400 text-lg mb-10 max-w-xl mx-auto' },
        'One SKILL.md compiles to every platform format — system prompt, ChatGPT Action, and MCP endpoint.'
      ),
      // Platform badges
      React.createElement(
        'div',
        { className: 'flex items-center justify-center gap-3 mb-14' },
        ...PLATFORMS.map(p => React.createElement(PlatformBadge, { key: p, platform: p }))
      ),
      // 3-step explainer
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
    // Skills Directory
    React.createElement(
      'section',
      { className: 'pb-20' },
      React.createElement(
        'h2',
        { className: 'text-2xl font-semibold text-zinc-100 mb-2' },
        'Skills'
      ),
      React.createElement(
        'p',
        { className: 'text-zinc-400 mb-8' },
        `${skills.length} skill${skills.length === 1 ? '' : 's'} available`
      ),
      React.createElement(
        'div',
        { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
        ...skills.map(skill =>
          React.createElement(SkillCard, { key: skill.name, skill })
        )
      )
    )
  )
}

async function getStaticProps() {
  const skills = await listSkills()
  return { props: { skills } }
}

const pageExports = { default: HomePage, getStaticProps }
module.exports = pageExports
module.exports.default = HomePage
