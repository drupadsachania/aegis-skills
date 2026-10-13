'use strict'

const React = require('react')
const Layout = require('../components/Layout')
const CodeBlock = require('../components/CodeBlock')
const InstallTabs = require('../components/InstallTabs')
const StatusPill = require('../components/StatusPill')

const h = React.createElement

const ASK = 'Using the Aegis exposure-validation skill I pasted, assess whether CVE-2026-12345 is exposed on web-01. I am authorised to test web-01.'

function Step ({ n, children }) {
  return h('li', { className: 'qs-step' }, h('span', { className: 'qs-n', 'aria-hidden': 'true' }, n), h('div', null, children))
}

function Panel ({ id, num, title, lede, children }) {
  return h('section', { className: 'doc-section qs-panel', id },
    h('div', { className: 'doc-section-hd', 'data-reveal': '' },
      h('span', { className: 'ds-num' }, num),
      h('h2', null, title)),
    h('p', { className: 'lede' }, lede),
    children)
}

function QuickStartPage ({ skillCount, mcp, scope, promptKb, hostedMcpTabs }) {
  return h(Layout, { title: 'Quick start', description: 'Try Aegis in two minutes with nothing to install: paste one prompt into any chat AI, or connect the hosted read-only MCP.' },
    h('div', { className: 'container', style: { paddingBottom: '120px' } },
      h('div', { className: 'page-head' },
        h('div', { className: 'eyebrow' }, 'Quick start'),
        h('h1', null, 'Try it in ', h('em', null, '2 minutes')),
        h('p', null, `Two ways that work today, with no install and no account. Pick one, run it, and compare what you see with what is shown below. Both use the same ${skillCount} skills.`),
        h('p', { className: 'status-note' }, 'Nothing here calls a model on our side. See ', h('a', { href: '/trust' }, 'Trust and data flow'), '.')),

      h(Panel, { id: 'prompt', num: 'A', title: 'Paste one file into any chat AI',
        lede: 'Fastest. Works in Claude.ai, ChatGPT, Gemini or any chat that takes pasted text.' },
        h('ol', { className: 'qs-steps' },
          h(Step, { n: '1' }, 'Open ', h('a', { href: '/skills/exposure-validation' }, 'the exposure-validation skill'), ' (or any skill) and press ', h('strong', null, 'Copy prompt'), `. It is one markdown file, about ${promptKb} KB.`),
          h(Step, { n: '2' }, 'Paste it as the first message of a new chat.'),
          h(Step, { n: '3' }, 'Then ask:', h(CodeBlock, { label: 'your message', content: ASK }))),
        h('h3', { className: 'qs-sub' }, 'What you will see'),
        h('p', null, h('strong', null, 'Real: '), 'near the top of the file you pasted, right after the title, the skill states its scope. Copied from the skill itself:'),
        h('blockquote', { className: 'qs-quote' }, ...scope.map((l, i) => h('p', { key: i }, l))),
        h('p', { className: 'qs-illus' }, h('strong', null, 'Illustrative, not captured output: '),
          'because the skill asks for authorization and scope first, expect your AI to confirm what web-01 is, that you may test it and what is out of bounds before it suggests any check. Its wording will differ from run to run.')),

      h(Panel, { id: 'mcp', num: 'B', title: 'Connect the hosted MCP',
        lede: 'Read-only. Your AI client can list skills and read their methodology on demand. No key, no account.' },
        h(InstallTabs, { tabs: hostedMcpTabs }),
        h('h3', { className: 'qs-sub' }, 'What you will see'),
        h('p', null, h('strong', null, 'Real output. '), 'Ask your AI to "list Aegis skills about exposure". It calls the first tool below with ', h('code', null, JSON.stringify(mcp.list.call.arguments)), ' and receives exactly this. The same server code runs at the hosted endpoint; the output was captured by running the tools in-process when this page was built.'),
        h(CodeBlock, { label: mcp.list.call.name, content: mcp.list.text }),
        h('p', null, 'Ask for one of them and it calls ', h('code', null, mcp.get.call.name), ' with ', h('code', null, JSON.stringify(mcp.get.call.arguments)), '. Trimmed here: the ', h('code', null, mcp.get.omitted.join(', ')), ' fields are left out for length.'),
        h(CodeBlock, { label: mcp.get.call.name, content: mcp.get.text }),
        h('p', null, 'A third tool, ', h('code', null, 'get_skill_phase'), ', returns the methodology text of one phase.')),

      h('section', { className: 'doc-section' },
        h('div', { className: 'doc-section-hd', 'data-reveal': '' }, h('span', { className: 'ds-num' }, '→'), h('h2', null, 'Next')),
        h('ul', { className: 'bullets' },
          h('li', null, h('a', { href: '/themis' }, 'Themis'), ' ', h(StatusPill, { status: 'in-development' }), ': a governed agent that picks skills for you and asks before it writes or executes. It is being matured locally and runs from the repository; it is not published yet.'),
          h('li', null, h('a', { href: '/paths' }, 'Choose your path'), ': every install route, from the skill pack in your assistant to the local dashboard.'),
          h('li', null, h('a', { href: '/skills' }, `Browse all ${skillCount} skills`), '.'),
          h('li', null, h('a', { href: '/trust' }, 'Trust and data flow'), ': what runs where, and how to check it.'))))
  )
}

async function getStaticProps () {
  const fs = require('fs')
  const path = require('path')
  const { captureAegisMcp, EXAMPLE_SKILL } = require('../lib/captured-mcp')
  const { SKILLS_DIR, DOWNLOADS_DIR } = require('../lib/site-paths')
  const { stripFrontmatter, extractSection } = require('../lib/skill-page')
  const { PATHS } = require('../lib/install-commands')

  const mcp = await captureAegisMcp()
  const body = stripFrontmatter(fs.readFileSync(path.join(SKILLS_DIR, EXAMPLE_SKILL, 'SKILL.md'), 'utf8'))
  const section = extractSection(body, 'Scope and authorization') || ''
  const scope = section.split('\n').map(l => l.trim()).filter(l => /^[-*]\s+/.test(l)).map(l => l.replace(/^[-*]\s+/, ''))
  const prompt = path.join(DOWNLOADS_DIR, 'prompts', `${EXAMPLE_SKILL}.md`)
  const promptKb = fs.existsSync(prompt) ? Math.max(1, Math.round(fs.statSync(prompt).size / 1024)) : 0
  return { props: { skillCount: mcp.skillCount, mcp, scope, promptKb, hostedMcpTabs: PATHS.find(p => p.id === 'hosted-mcp').platforms } }
}

module.exports = { default: QuickStartPage, getStaticProps }
module.exports.default = QuickStartPage
