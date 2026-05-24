'use strict'

const React = require('react')
const Head = require('next/head').default
const Layout = require('../components/Layout')

module.exports = function ThemisPage() {
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      Head,
      null,
      React.createElement('title', null, 'Themis — Themis · Aegis')
    ),
    React.createElement(
      Layout,
      null,
      React.createElement('div', { className: 'docs-page' },
        React.createElement('div', { className: 'hero-meta' },
          React.createElement('span', { className: 'hero-meta-dot' }),
          React.createElement('span', null, 'SYSTEM OVERVIEW')
        ),
        React.createElement('h1', { className: 'hero-h1' }, 'Themis'),
        React.createElement('p', { className: 'hero-desc' },
          'LLM-driven multi-phase task reasoning engine. Decomposes complex goals into skills, evaluates outcomes, and provides audit trails for transparency.'
        ),

        React.createElement('section', { className: 'doc-section' },
          React.createElement('h2', null, '01 — Architecture'),
          React.createElement('p', null,
            'Themis operates as a multi-node LangGraph topology:'
          ),
          React.createElement('ul', { style: { marginLeft: '20px', marginTop: '16px', marginBottom: '24px' } },
            React.createElement('li', { style: { marginBottom: '8px' } },
              React.createElement('strong', null, 'specNode'),
              ' — Parses the input goal and emits a task spec'
            ),
            React.createElement('li', { style: { marginBottom: '8px' } },
              React.createElement('strong', null, 'fanOutNode'),
              ' — Decomposes spec into phases and recommended skills'
            ),
            React.createElement('li', { style: { marginBottom: '8px' } },
              React.createElement('strong', null, 'skillAgentNode'),
              ' — Invokes Aegis skills in parallel'
            ),
            React.createElement('li', { style: { marginBottom: '8px' } },
              React.createElement('strong', null, 'guardrailNode'),
              ' — Validates outputs against security & data constraints'
            ),
            React.createElement('li', { style: { marginBottom: '8px' } },
              React.createElement('strong', null, 'synthesisNode'),
              ' — Combines results into coherent response'
            ),
            React.createElement('li', null,
              React.createElement('strong', null, 'auditNode'),
              ' — Logs decision trace for transparency'
            )
          )
        ),

        React.createElement('section', { className: 'doc-section' },
          React.createElement('h2', null, '02 — Core Principles'),
          React.createElement('ul', { style: { marginLeft: '20px', marginTop: '16px', marginBottom: '24px' } },
            React.createElement('li', { style: { marginBottom: '12px' } },
              React.createElement('strong', null, 'Decomposition'),
              ' — Complex problems become skill sequences. Themis chooses which skills and in what order.'
            ),
            React.createElement('li', { style: { marginBottom: '12px' } },
              React.createElement('strong', null, 'Guardrails'),
              ' — Every LLM output is untrusted. Validation gates prevent data leakage and ensure constraint compliance.'
            ),
            React.createElement('li', { style: { marginBottom: '12px' } },
              React.createElement('strong', null, 'Audit Trail'),
              ' — Every decision (spec, phase breakdown, skill choice, outcome) is logged. Enables debugging and compliance.'
            ),
            React.createElement('li', null,
              React.createElement('strong', null, 'Security by Default'),
              ' — No task content, API responses, or user data logged. Only metadata: hashes, token counts, verdicts.'
            )
          )
        ),

        React.createElement('section', { className: 'doc-section' },
          React.createElement('h2', null, '03 — Security Model'),
          React.createElement('p', null,
            'Themis treats all inputs as untrusted:'
          ),
          React.createElement('ul', { style: { marginLeft: '20px', marginTop: '16px', marginBottom: '24px' } },
            React.createElement('li', { style: { marginBottom: '8px' } },
              'All LLM provider SDKs run server-side only'
            ),
            React.createElement('li', { style: { marginBottom: '8px' } },
              'Logs contain only metadata, never task or response content'
            ),
            React.createElement('li', { style: { marginBottom: '8px' } },
              'Client errors are sanitized — one of three fixed strings, no internal paths'
            ),
            React.createElement('li', { style: { marginBottom: '8px' } },
              'LLM outputs are validated before being exposed to downstream nodes'
            ),
            React.createElement('li', null,
              'No skill can access another skill\'s raw outputs — only guardrail-validated results'
            )
          )
        ),

        React.createElement('section', { className: 'doc-section' },
          React.createElement('h2', null, '04 — Request Flow'),
          React.createElement('ol', { style: { marginLeft: '20px', marginTop: '16px', marginBottom: '24px' } },
            React.createElement('li', { style: { marginBottom: '12px' } },
              'Client sends goal to ',
              React.createElement('code', { style: { background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '3px' } }, 'POST /api/themis'),
              ' with constraints'
            ),
            React.createElement('li', { style: { marginBottom: '12px' } },
              'Themis parses goal into task spec (LLM)'
            ),
            React.createElement('li', { style: { marginBottom: '12px' } },
              'Decomposes into phases and recommended skills (LLM)'
            ),
            React.createElement('li', { style: { marginBottom: '12px' } },
              'Invokes skills in parallel via Aegis'
            ),
            React.createElement('li', { style: { marginBottom: '12px' } },
              'Validates each output against guardrails'
            ),
            React.createElement('li', { style: { marginBottom: '12px' } },
              'Synthesizes results into response (LLM)'
            ),
            React.createElement('li', null,
              'Logs entire decision trace with verdicts'
            )
          )
        ),

        React.createElement('section', { className: 'doc-section' },
          React.createElement('h2', null, '05 — Error Handling'),
          React.createElement('p', null,
            'Themis is designed to be resilient:'
          ),
          React.createElement('ul', { style: { marginLeft: '20px', marginTop: '16px', marginBottom: '24px' } },
            React.createElement('li', { style: { marginBottom: '8px' } },
              'Skill invocation failures are caught and logged'
            ),
            React.createElement('li', { style: { marginBottom: '8px' } },
              'Guardrail violations block synthesis but don\'t crash'
            ),
            React.createElement('li', { style: { marginBottom: '8px' } },
              'Timeouts abort the phase and synthesize partial results'
            ),
            React.createElement('li', null,
              'Client receives one of three sanitized error messages'
            )
          )
        )
      )
    )
  )
}
