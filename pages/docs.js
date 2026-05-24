'use strict'

const React = require('react')
const Head = require('next/head').default
const Layout = require('../components/Layout')

module.exports = function DocsPage() {
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      Head,
      null,
      React.createElement('title', null, 'Documentation — Themis · Aegis')
    ),
    React.createElement(
      Layout,
      null,
      React.createElement('div', { className: 'docs-page' },
        React.createElement('div', { className: 'hero-meta' },
          React.createElement('span', { className: 'hero-meta-dot' }),
          React.createElement('span', null, 'GUIDES & REFERENCE')
        ),
        React.createElement('h1', { className: 'hero-h1' }, 'Documentation'),
        React.createElement('p', { className: 'hero-desc' },
          'Learn how to use Aegis skills, understand the Themis reasoning engine, and troubleshoot common issues.'
        ),

        React.createElement('section', { className: 'doc-section' },
          React.createElement('h2', null, '01 — Getting Started'),
          React.createElement('p', null,
            'Aegis exposes a library of skills that can be invoked individually or chained together through Themis.'
          ),
          React.createElement('h3', { style: { fontSize: '16px', marginTop: '20px', marginBottom: '12px', color: 'var(--cream)' } }, 'What is a Skill?'),
          React.createElement('p', null,
            'A skill is a self-contained, versioned agent designed for a specific task. Each skill includes documentation, input schema, output schema, and phase definitions. Skills are discovered via the ',
            React.createElement('code', { style: { background: 'rgba(255,255,255,0.08)', padding: '2px 6px' } }, 'GET /api/skills'),
            ' endpoint.'
          ),
          React.createElement('h3', { style: { fontSize: '16px', marginTop: '20px', marginBottom: '12px', color: 'var(--cream)' } }, 'Invoking a Skill'),
          React.createElement('p', null,
            'To invoke a skill directly:'
          ),
          React.createElement('div', { className: 'code-block', style: { marginTop: '12px', marginBottom: '12px' } },
            React.createElement('div', { className: 'code-body', style: { fontSize: '12px', fontFamily: 'var(--f-mono)', padding: '12px', color: 'var(--cream-dim)' } },
              'curl -X POST https://aegis-skills.vercel.app/api/deception-engineering/invoke \\',
              React.createElement('br', null),
              '  -H "Content-Type: application/json" \\',
              React.createElement('br', null),
              '  -d \'{"input": "Your input here"}\'',
              React.createElement('br', null),
              React.createElement('br', null),
              '# Response includes: phase definitions, output, phase summaries'
            )
          )
        ),

        React.createElement('section', { className: 'doc-section' },
          React.createElement('h2', null, '02 — API Reference'),
          React.createElement('h3', { style: { fontSize: '16px', marginTop: '20px', marginBottom: '12px', color: 'var(--cream)' } }, 'GET /api/skills'),
          React.createElement('p', null,
            'Retrieve all available skills and their metadata.'
          ),
          React.createElement('h3', { style: { fontSize: '16px', marginTop: '20px', marginBottom: '12px', color: 'var(--cream)' } }, 'GET /api/[skill]/manifest'),
          React.createElement('p', null,
            'Fetch the full manifest for a skill, including schema, phases, and documentation.'
          ),
          React.createElement('h3', { style: { fontSize: '16px', marginTop: '20px', marginBottom: '12px', color: 'var(--cream)' } }, 'POST /api/[skill]/invoke'),
          React.createElement('p', null,
            'Execute a skill with the provided input. Returns phase output and metadata.'
          ),
          React.createElement('h3', { style: { fontSize: '16px', marginTop: '20px', marginBottom: '12px', color: 'var(--cream)' } }, 'GET /api/[skill]/phase/[phaseId]'),
          React.createElement('p', null,
            'Retrieve detailed information about a specific phase within a skill.'
          )
        ),

        React.createElement('section', { className: 'doc-section' },
          React.createElement('h2', null, '03 — Troubleshooting'),

          React.createElement('h3', { style: { fontSize: '16px', marginTop: '20px', marginBottom: '12px', color: 'var(--gold)' } }, 'Q: Skill returns 404'),
          React.createElement('p', null,
            'The skill name does not exist or is misspelled. Check ',
            React.createElement('code', { style: { background: 'rgba(255,255,255,0.08)', padding: '2px 6px' } }, 'GET /api/skills'),
            ' for the exact skill names available.'
          ),

          React.createElement('h3', { style: { fontSize: '16px', marginTop: '20px', marginBottom: '12px', color: 'var(--gold)' } }, 'Q: Invoke returns 400 (Bad Request)'),
          React.createElement('p', null,
            'Your input does not match the skill\'s schema. Check the manifest to see required fields and types.'
          ),

          React.createElement('h3', { style: { fontSize: '16px', marginTop: '20px', marginBottom: '12px', color: 'var(--gold)' } }, 'Q: Invoke times out'),
          React.createElement('p', null,
            'The skill took longer than expected. This can happen if the skill is computationally intensive. Try again, or contact support if timeouts persist.'
          ),

          React.createElement('h3', { style: { fontSize: '16px', marginTop: '20px', marginBottom: '12px', color: 'var(--gold)' } }, 'Q: Themis returns sanitized error'),
          React.createElement('p', null,
            'Themis hides internal details from the client for security. Your input may violate guardrails, or a skill may have failed. Check the audit log (if available in your environment) for details.'
          ),

          React.createElement('h3', { style: { fontSize: '16px', marginTop: '20px', marginBottom: '12px', color: 'var(--gold)' } }, 'Q: How do I understand what a skill does?'),
          React.createElement('p', null,
            'Click on any skill in the Skills table to view its full documentation, phases, and installation instructions.'
          )
        ),

        React.createElement('section', { className: 'doc-section' },
          React.createElement('h2', null, '04 — Architecture Overview'),
          React.createElement('p', null,
            'Aegis powers the skill library and Themis provides multi-phase reasoning. See the ',
            React.createElement('a', { href: '/themis', style: { color: 'var(--accent)', textDecoration: 'underline' } }, 'Themis page'),
            ' for details on the multi-node LangGraph architecture, security model, and request flow.'
          )
        ),

        React.createElement('section', { className: 'doc-section' },
          React.createElement('h2', null, '05 — Support'),
          React.createElement('p', null,
            'For detailed technical documentation, see ',
            React.createElement('a', { href: 'https://github.com/kairo-foundation/aegis', style: { color: 'var(--accent)', textDecoration: 'underline' } }, 'TECHNICAL.md'),
            ' in the GitHub repository.'
          )
        )
      )
    )
  )
}
