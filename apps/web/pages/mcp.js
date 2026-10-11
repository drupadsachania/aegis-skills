'use strict'

const React = require('react')
const Layout = require('../components/Layout')
const InstallTabs = require('../components/InstallTabs')
const CodeBlock = require('../components/CodeBlock')
const { MCP_URL } = require('../lib/install-commands')

const h = React.createElement

const TOOLS = [
  ['list_skills', 'Every skill with its family, summary and phase count (optional arguments: query, family)'],
  ['get_skill', 'One skill\'s description, frameworks, tags, context and ordered phase ids (argument: name)'],
  ['get_skill_phase', 'The full text of one phase (arguments: name, phase id or index)']
]

const CHECK_CMD = `curl -s -X POST ${MCP_URL} \\
  -H "content-type: application/json" \\
  -H "accept: application/json, text/event-stream" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'`

function Sec ({ id, num, title, children }) {
  return h('section', { className: 'doc-section', id },
    h('div', { className: 'doc-section-hd', 'data-reveal': '' },
      h('span', { className: 'ds-num' }, num),
      h('h2', null, title)),
    children)
}

function McpPage ({ paths }) {
  return h(
    Layout,
    { title: 'Hosted MCP', description: 'Connect Claude.ai, ChatGPT or any MCP client to the read-only Aegis skill server.' },
    h('div', { className: 'container', style: { paddingBottom: '120px' } },
      h('div', { className: 'page-head' },
        h('div', { className: 'eyebrow' }, 'Zero install'),
        h('h1', null, 'Hosted Aegis ', h('em', null, 'MCP')),
        h('p', null, 'Read every Aegis skill from Claude.ai, ChatGPT or any MCP client, with nothing to install. The server is read-only and serves public skill text only.')),

      h(Sec, { id: 'endpoint', num: '01', title: 'Endpoint' },
        h(CodeBlock, { label: 'Streamable HTTP', content: MCP_URL }),
        h('ul', { className: 'bullets', style: { marginTop: '20px' } },
          h('li', null, 'No authentication and no sessions: each request is handled independently.'),
          h('li', null, 'No model calls, no accounts, no application logs or analytics. Vercel\'s standard platform request logs apply.'),
          h('li', null, 'Requests over 64 KB are rejected.'))),

      h(Sec, { id: 'tools', num: '02', title: 'Tools' },
        h('div', { className: 'table-wrap' },
          h('table', { className: 'platforms-table' },
            h('thead', null, h('tr', null, h('th', null, 'Tool'), h('th', null, 'Returns'))),
            h('tbody', null, ...TOOLS.map(([t, d]) => h('tr', { key: t },
              h('td', null, h('code', null, t)), h('td', null, d)))))),
        h('p', { style: { marginTop: '16px' } }, 'Tool names are stable; Themis depends on them.')),

      h(Sec, { id: 'connect', num: '03', title: 'Connect' },
        h(InstallTabs, { tabs: paths.find(p => p.id === 'hosted-mcp').platforms })),

      h(Sec, { id: 'local', num: '04', title: 'Prefer local?' },
        h('p', null, 'Run the same server on your machine over stdio (needs the npm package, so after the first release):'),
        h(CodeBlock, { label: 'MCP config', content: JSON.stringify({ mcpServers: { aegis: { command: 'npx', args: ['-y', 'aegis-skills', 'mcp'] } } }, null, 2) })),

      h(Sec, { id: 'check', num: '05', title: 'Check it works' },
        h(CodeBlock, { label: 'shell', content: CHECK_CMD }),
        h('p', { style: { marginTop: '16px' } }, 'You should see list_skills, get_skill and get_skill_phase. ',
          h('a', { href: '/docs/aegis/hosted-mcp' }, 'Hosted MCP docs →'))))
  )
}

async function getStaticProps () {
  const { PATHS } = require('../lib/install-commands')
  return { props: { paths: PATHS } }
}

module.exports = { default: McpPage, getStaticProps }
module.exports.default = McpPage
