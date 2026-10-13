'use strict'

const React = require('react')
const Layout = require('../components/Layout')
const PathMatrix = require('../components/PathMatrix')
const { Logo } = require('../components/Brand')
const AegisThemisFlow = require('../components/AegisThemisFlow')
const StatusPill = require('../components/StatusPill')

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
  { n: '01', label: 'No hosted inference', desc: 'The website never calls a model. Prompts and zips are static files; the hosted MCP only serves skill text. Each path\'s data flow is written out and checkable.', href: '/trust', hrefLabel: 'Trust and data flow' },
  { n: '02', label: 'Human-approved actions', desc: 'Themis classifies every external tool as read, write or execute. Writes and executes wait for a person, never the model.' },
  { n: '03', label: 'Scoped by design', desc: 'Every skill states its defensive purpose and is for systems you own or are authorized to assess.' },
  { n: '04', label: 'Open and portable', desc: 'Apache-2.0 OR MIT. Markdown and JSON you can read, fork and run anywhere.' }
]

function SecHead ({ num, kicker }) {
  return h('div', { className: 'sec-head', 'data-reveal': '' },
    h('span', { className: 'sec-num' }, num),
    h('span', { className: 'sec-kicker' }, kicker))
}

function Section ({ id, children }) {
  return h('section', { id, 'aria-label': undefined, style: { position: 'relative', zIndex: 1 } },
    h('div', { className: 'container' }, h('div', { className: 'section' }, children)))
}

// Large raster marks for the pack cards (lazy: they sit below the fold; sizes are explicit, so no layout shift).
const MARK_AEGIS = h(Logo, { brand: 'aegis', kind: 'mark', className: 'twin-logo' })
const MARK_THEMIS = h(Logo, { brand: 'themis', kind: 'mark', className: 'twin-logo' })

function ProvenanceSection ({ stamp, stampLine }) {
  return h(Section, { id: 'provenance' },
    h(SecHead, { num: '03', kicker: 'Provenance and approval' }),
    h('h2', { className: 'sec-title', 'data-reveal': '' }, 'Know what produced it, ', h('em', null, 'and who approved it'), '.'),
    h('div', { className: 'prov-grid' },
      h('div', { className: 'prov-card', 'data-reveal': '' },
        h('h3', null, 'Version stamp'),
        h('p', null, 'Themis records the exact versions behind each run: its own core, the installed Aegis pack and the skill-format (osk) version. This is a real stamp, read from this repository.'),
        h('pre', { className: 'prov-code', tabIndex: 0, 'aria-label': 'Example version stamp' }, JSON.stringify(stamp, null, 2)),
        h('p', { className: 'prov-line' }, stampLine),
        h('p', { className: 'prov-note' }, 'In standalone reports it is the footer line above and a field in the JSON export. In plugin mode it is returned with every run and with the report. The website itself produces none.')),
      h('div', { className: 'prov-card', 'data-reveal': '' },
        h('h3', null, 'Approval boundary'),
        h('ul', { className: 'bullets' },
          h('li', null, 'Every external tool is classified read, write or execute. An unmarked tool counts as a write.'),
          h('li', null, 'Writes and executes become approval requests. The gateway runs one only if it is approved and decided by a human, and only once.'),
          h('li', null, 'Only two channels can decide: the dashboard\'s Approvals page and your client\'s own prompt. No tool, graph step or model output can.')),
        h('p', { className: 'prov-note' }, 'Honest limit: tools you connect straight to your assistant bypass Themis. ',
          h('a', { href: '/docs/themis/governance' }, 'Governance'), ' · ', h('a', { href: '/themis#provenance' }, 'On the Themis page'), ' · ', h('a', { href: '/trust' }, 'Trust and data flow')))))
}

function HomePage ({ skillCount, familyCount, paths, stamp, stampLine }) {
  return h(
    Layout,
    null,

    // Hero
    h('section', { className: 'hero' },
      h('div', { className: 'container' },
        h('div', { className: 'hero-inner' },
          h('div', { className: 'hero-meta' },
            h('span', { className: 'dot' }), 'Aegis + Themis', h('span', { className: 'sep' }), 'Open cybersecurity pack'),
          h('h1', { className: 'hero-h1 k-lines' },
            // explicit lines: each clips and rises with a 70 ms step (CSS animation only; always ends visible)
            h('span', { className: 'k-line', style: { '--line': 0 } }, h('span', null, 'Security skills')), ' ',
            h('span', { className: 'k-line', style: { '--line': 1 } }, h('span', null, 'and a SOC agent,')), ' ',
            h('span', { className: 'k-line', style: { '--line': 2 } }, h('span', null, h('em', null, 'on your own AI'), '.'))),
          h('p', { className: 'hero-desc' },
            `Aegis is ${skillCount} defensive security skills in the open Agent Skills format. Themis is a governed security-operations agent that runs inside Claude Code, Codex or Gemini CLI, or as a local dashboard with your own model. No account, no hosted inference, Apache-2.0 OR MIT.`),
          h('div', { className: 'hero-cta' },
            h('a', { className: 'btn-primary', href: '/quickstart' }, 'Try it in 2 minutes'),
            h('a', { className: 'btn-ghost', href: '/skills' }, `Browse all ${skillCount} skills`)),
          h('p', { className: 'hero-sub' }, 'Nothing to install and no account. Or ', h('a', { href: '#paths' }, 'choose your path'), '.')))),

    // 01 The pack
    h('div', { className: 'pack-wrap' },
      h('section', { className: 'pack' },
        h(SecHead, { num: '01', kicker: 'The pack' }),
        h('div', { className: 'twin' },
          h('div', { className: 'twin-card aegis', 'data-reveal': '' },
            MARK_AEGIS,
            h('div', { className: 'twin-tag' }, h('span', { className: 'marker' }), 'Aegis'),
            h('h3', null, 'Aegis'),
            h('div', { className: 'role' }, 'Skill pack · open Agent Skills format'),
            h('p', null,
              `${skillCount} skills across ${familyCount} families: ATT&CK, ATLAS and Engage mapping, threat hunting, exposure validation, forensics, malware analysis, OT, identity, compliance and more. Each skill is plain markdown with a scope and authorization section, and its content is updated monthly.`),
            h('p', { className: 'twin-rel' }, 'Aegis provides the specialist skill; Themis decides how an agent invokes it.'),
            h('a', { href: '/skills', className: 'twin-link' }, 'Browse skills', h('span', { 'aria-hidden': 'true' }, '→'))),
          h('div', { className: 'twin-card themis', 'data-reveal': '' },
            MARK_THEMIS,
            h('div', { className: 'twin-tag' }, h('span', { className: 'marker' }), 'Themis', h(StatusPill, { status: 'in-development' })),
            h('h3', null, 'Themis'),
            h('div', { className: 'role' }, 'SOC agent · plugin or standalone'),
            h('p', null,
              'Plans a security task, fans it out to specialist skills, checks every output with guardrails, and writes a report stamped with the exact Themis and Aegis versions. Tools that write or execute only run after a human approves them.'),
            h('p', { className: 'twin-rel' }, 'Themis governs how an agent invokes an Aegis skill and what it can do with the result.'),
            h('p', { className: 'twin-status' }, 'Local-first and still being matured. It runs from the repository today; it is not on npm or in AI directories yet.'),
            h('a', { href: '/themis', className: 'twin-link' }, 'How Themis works', h('span', { 'aria-hidden': 'true' }, '→')))),
        h(AegisThemisFlow))),

    // 02 Choose your path
    h(Section, { id: 'paths' },
      h(SecHead, { num: '02', kicker: 'Choose your path' }),
      h('h2', { className: 'sec-title', 'data-reveal': '' }, 'The same skills, ', h('em', null, 'your path'), '.'),
      h(PathMatrix, { paths }),
      h('p', { className: 'lede', style: { marginTop: '28px', marginBottom: 0 } },
        'Every path uses the same skills. Start with zero install and move up when you need more. ',
        h('a', { href: '/paths' }, 'All install commands →')),
      h('p', { className: 'path-note' },
        'Aegis 1.5.0 is on npm, and the plugin, the zero-install prompts and the hosted MCP all work today. Themis is in development and local-first; it is not published to npm or AI directories yet, and its rows are marked.')),

    // 03 Provenance and approval
    h(ProvenanceSection, { stamp, stampLine }),

    // 04 Why trust it
    h(Section, { id: 'trust' },
      h(SecHead, { num: '04', kicker: 'Why trust it' }),
      h('ol', { className: 'principles' },
        ...TRUST.map(t => h('li', { key: t.n, className: 'principle', 'data-reveal': '' },
          h('span', { className: 'step-num' }, t.n),
          h('h3', null, t.label),
          h('p', null, t.desc, t.href ? [' ', h('a', { key: 'l', href: t.href }, t.hrefLabel, ' →')] : null))))),

    // 05 Intel
    h(Section, { id: 'intel' },
      h(SecHead, { num: '05', kicker: 'Updated threat intel' }),
      h('p', { className: 'lede' },
        'Skills go stale as the threat landscape moves. Threat-intel feeds are distilled into reusable attack patterns, and each pattern is routed into the skills whose attack surface it lands on. Skill content is updated monthly. Generated intel lives in its own reference file, is labelled LIVE, and never edits hand-written tradecraft. Every download carries an "Intel as of" date.'),
      h('div', { className: 'steps-grid' },
        ...INTEL_STEPS.map(step => h('div', { key: step.n, className: 'step-cell', 'data-reveal': '' },
          h('span', { className: 'step-num' }, step.n),
          h('h3', null, step.label),
          h('p', null, step.desc)))))
  )
}

async function getStaticProps () {
  const { listSkills } = require('../lib/aegis')
  const { FAMILIES } = require('../lib/aegis')
  const { PATHS } = require('../lib/install-commands')
  const { sampleStamp, stampLine } = require('../lib/version-stamp-sample')
  const stamp = sampleStamp()
  return { props: { skillCount: (await listSkills()).length, familyCount: FAMILIES.length, paths: PATHS, stamp, stampLine: stampLine(stamp) } }
}

module.exports = { default: HomePage, getStaticProps }
module.exports.default = HomePage
