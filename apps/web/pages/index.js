'use strict'

const React = require('react')
const Layout = require('../components/Layout')
const PathMatrix = require('../components/PathMatrix')

const h = React.createElement

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

const TRUST = [
  { n: '01', label: 'No hosted inference', desc: 'The website never calls a model. Prompts and zips are static files; the hosted MCP only serves skill text.' },
  { n: '02', label: 'Human-approved actions', desc: 'Themis classifies every external tool as read, write or execute. Writes and executes wait for a person, never the model.' },
  { n: '03', label: 'Scoped by design', desc: 'Every skill states its defensive purpose and is for systems you own or are authorized to assess.' },
  { n: '04', label: 'Open and portable', desc: 'Apache-2.0 OR MIT. Markdown and JSON you can read, fork and run anywhere.' }
]

function SecHead ({ num, kicker }) {
  return h('div', { className: 'sec-head' },
    h('span', { className: 'sec-num' }, num),
    h('span', { className: 'sec-kicker' }, kicker))
}

function Section ({ id, children }) {
  return h('section', { id, 'aria-label': undefined, style: { position: 'relative', zIndex: 1 } },
    h('div', { className: 'container' }, h('div', { className: 'section' }, children)))
}

const MARK_AEGIS = h('svg', { className: 'twin-mark', viewBox: '0 0 56 56', 'aria-hidden': 'true', focusable: 'false' },
  h('rect', { className: 'm', x: 10, y: 10, width: 36, height: 36, rx: 8, transform: 'rotate(45 28 28)' }))
const MARK_THEMIS = h('svg', { className: 'twin-mark', viewBox: '0 0 56 56', 'aria-hidden': 'true', focusable: 'false' },
  h('circle', { className: 'm', cx: 28, cy: 28, r: 22 }))

function HomePage ({ skillCount, familyCount, paths }) {
  return h(
    Layout,
    null,

    // Hero
    h('section', { className: 'hero' },
      h('div', { className: 'container' },
        h('div', { className: 'hero-inner' },
          h('div', { className: 'hero-meta' },
            h('span', { className: 'dot' }), 'Aegis + Themis', h('span', { className: 'sep' }), 'Open cybersecurity pack'),
          h('h1', { className: 'hero-h1' },
            'Security skills and a SOC agent, ', h('em', null, 'on your own AI'), '.'),
          h('p', { className: 'hero-desc' },
            `Aegis is ${skillCount} defensive security skills in the open Agent Skills format. Themis is a governed security-operations agent that runs inside Claude Code, Codex or Gemini CLI, or as a local dashboard with your own model. No account, no hosted inference, Apache-2.0 OR MIT.`),
          h('div', { className: 'hero-cta' },
            h('a', { className: 'btn-primary', href: '/paths' }, 'Choose your path'),
            h('a', { className: 'btn-ghost', href: '/skills' }, `Browse ${skillCount} skills`))))),

    // 01 The pack
    h('div', { className: 'pack-wrap' },
      h('section', { className: 'pack' },
        h(SecHead, { num: '01', kicker: 'The pack' }),
        h('div', { className: 'twin' },
          h('div', { className: 'twin-card aegis' },
            MARK_AEGIS,
            h('div', { className: 'twin-tag' }, h('span', { className: 'marker' }), 'Aegis'),
            h('h3', null, 'Aegis'),
            h('div', { className: 'role' }, 'Skill pack · open Agent Skills format'),
            h('p', null,
              `${skillCount} skills across ${familyCount} families: ATT&CK, ATLAS and Engage mapping, threat hunting, exposure validation, forensics, malware analysis, OT, identity, compliance and more. Each skill is plain markdown with a scope and authorization section, and its content is updated monthly.`),
            h('a', { href: '/skills', className: 'twin-link' }, 'Browse skills', h('span', { 'aria-hidden': 'true' }, '→'))),
          h('div', { className: 'twin-card themis' },
            MARK_THEMIS,
            h('div', { className: 'twin-tag' }, h('span', { className: 'marker' }), 'Themis'),
            h('h3', null, 'Themis'),
            h('div', { className: 'role' }, 'SOC agent · plugin or standalone'),
            h('p', null,
              'Plans a security task, fans it out to specialist skills, checks every output with guardrails, and writes a report stamped with the exact Themis and Aegis versions. Tools that write or execute only run after a human approves them.'),
            h('a', { href: '/themis', className: 'twin-link' }, 'How Themis works', h('span', { 'aria-hidden': 'true' }, '→')))))),

    // 02 Choose your path
    h(Section, { id: 'paths' },
      h(SecHead, { num: '02', kicker: 'Choose your path' }),
      h('h2', { className: 'sec-title' }, 'The same skills, ', h('em', null, 'your path'), '.'),
      h(PathMatrix, { paths }),
      h('p', { className: 'lede', style: { marginTop: '28px', marginBottom: 0 } },
        'Every path uses the same skills. Start with zero install and move up when you need more. ',
        h('a', { href: '/paths' }, 'All install commands →')),
      h('p', { className: 'path-note' },
        'Nothing is published to npm or a plugin marketplace yet: install commands that need them are marked "after the first release". Zero install and the hosted MCP work today.')),

    // 03 Why trust it
    h(Section, null,
      h(SecHead, { num: '03', kicker: 'Why trust it' }),
      h('ol', { className: 'principles' },
        ...TRUST.map(t => h('li', { key: t.n, className: 'principle' },
          h('span', { className: 'step-num' }, t.n),
          h('h3', null, t.label),
          h('p', null, t.desc))))),

    // 04 Intel
    h(Section, { id: 'intel' },
      h(SecHead, { num: '04', kicker: 'Updated threat intel' }),
      h('p', { className: 'lede' },
        'Skills go stale as the threat landscape moves. Threat-intel feeds are distilled into reusable attack patterns, and each pattern is routed into the skills whose attack surface it lands on. Skill content is updated monthly. Generated intel lives in its own reference file, is labelled LIVE, and never edits hand-written tradecraft. Every download carries an "Intel as of" date.'),
      h('div', { className: 'steps-grid' },
        ...INTEL_STEPS.map(step => h('div', { key: step.n, className: 'step-cell' },
          h('span', { className: 'step-num' }, step.n),
          h('h3', null, step.label),
          h('p', null, step.desc)))))
  )
}

async function getStaticProps () {
  const { listSkills } = require('../lib/aegis')
  const { FAMILIES } = require('../lib/aegis')
  const { PATHS } = require('../lib/install-commands')
  return { props: { skillCount: (await listSkills()).length, familyCount: FAMILIES.length, paths: PATHS } }
}

module.exports = { default: HomePage, getStaticProps }
module.exports.default = HomePage
