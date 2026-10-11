'use strict'

const React = require('react')
const Layout = require('../components/Layout')
const InstallTabs = require('../components/InstallTabs')
const Screenshot = require('../components/Screenshot')

const h = React.createElement

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
  ['Install', '/plugin install themis@aegis-skills, or an MCP config', 'npx @aegis-skills/themis dashboard']
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

function ThemisPage ({ paths, shots }) {
  const platformsOf = id => paths.find(p => p.id === id).platforms
  return h(
    Layout,
    { title: 'Themis', description: 'A governed security-operations agent that runs on your AI or as a local dashboard.' },
    h('div', { className: 'container', style: { paddingBottom: '120px' } },
      h('div', { className: 'page-head' },
        h('div', { className: 'eyebrow' }, 'SOC agent'),
        h('h1', null, h('em', null, 'Themis')),
        h('p', null, 'A security-operations agent built on Aegis. Give it a task, such as "validate exposure to CVE-2026-12345 on our VPN gateways". It plans the work, fans it out to specialist skills, checks every output, and writes a report stamped with the exact Themis and Aegis versions it used.'),
        h('p', { className: 'callout' },
          'Status: the plugin (1.1.0) and the standalone app (0.1.0) are built and tested in the repository. Their npm and marketplace installs open with the first release, and are marked below until then.')),

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

      h(Sec, { id: 'screenshots', num: '04', title: 'Screenshots' },
        h('div', { className: 'screenshot-grid' },
          ...shots.map(s => h(Screenshot, { key: s.file, src: '/img/themis/' + s.file, alt: s.alt, caption: s.caption, exists: s.exists })))),

      h(Sec, { id: 'install', num: '05', title: 'Install' },
        h('h3', null, 'Plugin mode (no API key)'),
        h(InstallTabs, { tabs: platformsOf('themis-plugin') }),
        h('h3', { style: { marginTop: '40px' } }, 'Standalone dashboard (your key or a local model)'),
        h(InstallTabs, { tabs: platformsOf('themis-app') })),

      h(Sec, { id: 'versions', num: '06', title: 'Versions' },
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
  return { props: { paths: PATHS, shots } }
}

module.exports = { default: ThemisPage, getStaticProps }
module.exports.default = ThemisPage
