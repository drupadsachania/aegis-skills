'use strict'

const React = require('react')
const Layout = require('../components/Layout')
const InstallTabs = require('../components/InstallTabs')
const Screenshot = require('../components/Screenshot')
const { Logo } = require('../components/Brand')
const StatusPill = require('../components/StatusPill')

const CodeBlock = require('../components/CodeBlock')

const h = React.createElement

// Verified from a checkout on 2026-10-12: the built CLI prints its version and the built plugin answers MCP initialize.
const FROM_SOURCE_APP = [
  'git clone https://github.com/drupadsachania/aegis-skills',
  'cd aegis-skills',
  'npm ci',
  'npm run build -w @aegis-skills/themis',
  'node packages/themis-app/bin/themis.js dashboard'
].join('\n')
const FROM_SOURCE_PLUGIN = [
  'npm run build -w @aegis-skills/themis-core -w @aegis-skills/themis-gateway -w @aegis-skills/themis-plugin',
  'node packages/themis-plugin/dist/index.js'
].join('\n')

const SHOTS = [
  { file: 'dashboard-run.png', alt: 'Themis dashboard Run page', caption: 'Run: sub-agents stream as each skill finishes.' },
  { file: 'dashboard-approvals.png', alt: 'Themis dashboard Approvals page', caption: 'Approvals: nothing that writes or executes runs without a click.' },
  { file: 'dashboard-models.png', alt: 'Themis dashboard Models and Keys page', caption: 'Models & Keys: bring your own key or a local model.' },
  { file: 'plugin-claude-code.png', alt: 'Themis plugin in Claude Code', caption: 'Plugin mode: the host AI reasons; Themis governs.' }
]

const COMPARE = [
  ['Where the model runs', 'Your assistant (Claude Code, Codex, Gemini CLI)', 'Your API key (Anthropic, OpenAI, Gemini) or a local model (Ollama, LM Studio)'],
  ['API key needed', 'No', 'Yes, or a local model'],
  ['Interface', 'Your assistant\'s chat', 'Local web dashboard on 127.0.0.1'],
  ['Orchestration', 'Your assistant runs each step, guided by the Themis skill', 'LangGraph runs the same workflow definition'],
  ['Approvals', 'Asked through your client\'s own prompt when it supports MCP elicitation; otherwise handed back for you to run', 'Approvals page in the dashboard'],
  ['Tool governance', 'Tools you register with Themis are governed; tools connected straight to your assistant are not', 'Every tool call is governed'],
  ['History and audit', 'Local SQLite in ~/.themis', 'Local SQLite in ~/.themis'],
  ['Install', 'An MCP config (a marketplace listing is planned)', 'npx @aegis-skills/themis dashboard']
]

// Kinds confirmed against THEMIS_WORKFLOW in @aegis-skills/themis-core.
const WORKFLOW = [
  ['validate', 'deterministic'],
  ['decompose', 'reasoning'],
  ['schedule', 'deterministic'],
  ['fan-out', 'reasoning'],
  ['guardrail', 'reasoning'],
  ['synthesise', 'reasoning'],
  ['audit', 'deterministic']
]

function Sec ({ id, num, title, children }) {
  return h('section', { className: 'doc-section', id },
    h('div', { className: 'doc-section-hd', 'data-reveal': '' },
      h('span', { className: 'ds-num' }, num),
      h('h2', null, title)),
    children)
}

function ThemisPage ({ paths, shots, stamp, stampLine }) {
  const platformsOf = id => paths.find(p => p.id === id).platforms
  return h(
    Layout,
    { title: 'Themis', description: 'A governed security-operations agent that runs on your AI or as a local dashboard.' },
    h('div', { className: 'container', style: { paddingBottom: '120px' } },
      h('div', { className: 'page-head page-head-logo' },
        h('div', { className: 'page-head-text' },
          h('div', { className: 'eyebrow' }, 'SOC agent'),
          h('p', { className: 'status-line' }, h(StatusPill, { status: 'in-development' })),
          h('h1', null, h('em', null, 'Themis')),
          h('p', null, 'A security-operations agent built on Aegis. Give it a task, such as "validate exposure to CVE-2026-12345 on our VPN gateways". It plans the work, fans it out to specialist skills, checks every output, and writes a report stamped with the exact Themis and Aegis versions it used.'),
          h('p', { className: 'callout' },
            'Status: in development. Themis is local-first and still being matured. The plugin (1.1.0) and the standalone app (0.1.0) are built and tested in the repository, and you can run both from a checkout today (see ', h('a', { href: '#install' }, 'Install'), '). They are not published to npm or AI directories yet; that will be announced here.')),
        // hero image: eager and high priority (above the fold)
        h(Logo, { brand: 'themis', kind: 'lockup', priority: true, className: 'hero-logo', reveal: true })),

      h(Sec, { id: 'modes', num: '01', title: 'Two ways to run' },
        h('div', { className: 'table-wrap' },
          h('table', { className: 'platforms-table compare-table' },
            h('thead', null, h('tr', null, ...['', 'Themis on your AI', 'Themis standalone'].map((c, i) => h('th', { key: i }, c)))),
            h('tbody', null, ...COMPARE.map(row => h('tr', { key: row[0] },
              ...row.map((c, i) => h('td', { key: i }, c)))))))),

      h(Sec, { id: 'workflow', num: '02', title: 'The workflow' },
        h('div', { className: 'lifecycle' },
          ...WORKFLOW.map(([id, kind], i) => h('div', { key: id, className: 'lifecycle-step' },
            h('span', { className: 'lifecycle-num' }, String(i + 1).padStart(2, '0')),
            h('span', { className: 'lifecycle-name' }, id),
            h('span', { className: 'lifecycle-tokens' }, kind)))),
        h('p', { style: { marginTop: '16px' } },
          'Deterministic steps are plain code in themis-core and behave the same in both modes. Reasoning steps are done by your assistant (plugin) or by the configured model (standalone).')),

      h(Sec, { id: 'governance', num: '03', title: 'Governance and approvals' },
        h('ul', { className: 'bullets' },
          h('li', null, 'Every external tool is classified read, write or execute.'),
          h('li', null, 'Reads run automatically within a per-run call budget and timeout; secrets are redacted and the output is wrapped as untrusted data.'),
          h('li', null, 'Writes and executes become approval requests. Only a human can approve: the dashboard\'s Approvals page, or your client\'s own MCP prompt. No tool, graph node or model output can approve.'),
          h('li', null, 'Every call, result and decision is written to the audit log.'),
          h('li', null, 'An unreachable tool server degrades to "no tools"; it never crashes a run.')),
        h('p', { className: 'muted' },
          'Honest boundary: in plugin mode, tools you connect directly to your assistant bypass Themis and are not governed or audited. Register security tools with Themis to govern them. ',
          h('a', { href: '/docs/themis/governance' }, 'Governance details →'))),

      h(Sec, { id: 'provenance', num: '04', title: 'Provenance and approval' },
        h('p', null, 'Every run carries a version stamp: the Themis core, the installed Aegis pack and the skill-format (osk) version. A real stamp from this repository:'),
        h('pre', { className: 'prov-code', tabIndex: 0, 'aria-label': 'Example version stamp' }, JSON.stringify(stamp, null, 2)),
        h('p', { className: 'prov-line' }, stampLine),
        h('p', null, 'Standalone reports end with that line and carry the stamp in their JSON export. In plugin mode the stamp is returned with each run payload and with the report. The stamp names the Aegis package installed next to Themis, so check it if you registered a different Aegis server separately.'),
        h('p', null, 'The approval boundary sits at execution: the gateway runs a write or execute action only if its approval is approved and decided by a human, and only once. ',
          h('a', { href: '/trust' }, 'Trust and data flow'), ' lists what runs where and how to verify it.')),

      h(Sec, { id: 'screenshots', num: '05', title: 'Screenshots' },
        h('div', { className: 'screenshot-grid' },
          ...shots.map(s => h(Screenshot, { key: s.file, src: '/img/themis/' + s.file, alt: s.alt, caption: s.caption, exists: s.exists })))),

      h(Sec, { id: 'where', num: '06', title: 'Where to get it' },
        h('div', { className: 'table-wrap' },
          h('table', { className: 'platforms-table where-table' },
            h('thead', null, h('tr', null, ...['', 'Status', 'Where'].map((c, i) => h('th', { key: i }, c)))),
            h('tbody', null,
              h('tr', null,
                h('td', null, 'Aegis'),
                h('td', null, h(StatusPill, { status: 'first-release' })),
                h('td', null, 'The first release: the npm package, with the plugin directories coming right after launch. The website, the downloads and the hosted MCP work today.')),
              h('tr', null,
                h('td', null, 'Themis'),
                h('td', null, h(StatusPill, { status: 'in-development' })),
                h('td', null, 'Local-first today: run it from the repository. Marketplace and directory distribution is planned for a later milestone, once its tool contract is stable and a supported remote endpoint exists.'))))),
        h('p', { className: 'muted', style: { marginTop: '16px' } }, 'These are plans, not promises, and they carry no dates. Anything that changes will be announced on this site.')),

      h(Sec, { id: 'install', num: '07', title: 'Install' },
        h('div', { className: 'install-indev' },
          h(StatusPill, { status: 'in-development' }),
          h('p', null, 'The npm and marketplace commands below are the planned installs and do not work yet. Run Themis from the repository today.')),
        h('h3', null, 'Run from the repository'),
        h('p', null, 'Needs Node.js 24 or later and a checkout of ', h('a', { href: 'https://github.com/drupadsachania/aegis-skills', target: '_blank', rel: 'noopener noreferrer' }, 'the repository'), '. Standalone dashboard:'),
        h(CodeBlock, { label: 'shell', content: FROM_SOURCE_APP }),
        h('p', null, 'Plugin mode: build the plugin, then register the built server with your assistant (the commands are in ', h('a', { href: '/docs/themis/mode-1-plugin' }, 'the plugin guide'), ').'),
        h(CodeBlock, { label: 'shell', content: FROM_SOURCE_PLUGIN }),
        h('h3', { style: { marginTop: '40px' } }, 'Plugin mode, planned install (no API key)'),
        h(InstallTabs, { tabs: platformsOf('themis-plugin') }),
        h('h3', { style: { marginTop: '40px' } }, 'Standalone dashboard, planned install (your key or a local model)'),
        h(InstallTabs, { tabs: platformsOf('themis-app') })),

      h(Sec, { id: 'versions', num: '08', title: 'Versions' },
        h('p', null,
          'Themis reads skills from any installed Aegis with the same osk major version. Monthly skill updates and new skills are picked up automatically; an osk major bump needs a Themis release. The plugin uses your installed Aegis; the standalone app bundles its own. ',
          h('a', { href: '/docs/themis/versions' }, 'Version compatibility →')),
        h('p', null, 'Skills only: ', h('a', { href: '/mcp' }, 'hosted MCP'), '. Trust: ', h('a', { href: '/security' }, 'security'), ' and ', h('a', { href: '/license' }, 'license'), '.')))
  )
}

async function getStaticProps () {
  const fs = require('fs')
  const path = require('path')
  const { WEB_ROOT } = require('../lib/site-paths')
  const { PATHS } = require('../lib/install-commands')
  const shots = SHOTS.map(s => ({ ...s, exists: fs.existsSync(path.join(WEB_ROOT, 'public', 'img', 'themis', s.file)) }))
  const { sampleStamp, stampLine } = require('../lib/version-stamp-sample')
  const stamp = sampleStamp()
  return { props: { paths: PATHS, shots, stamp, stampLine: stampLine(stamp) } }
}

module.exports = { default: ThemisPage, getStaticProps }
module.exports.default = ThemisPage
