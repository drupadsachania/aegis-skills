/**
 * @jest-environment jsdom
 */
'use strict'

const React = require('react')
const { render, screen } = require('@testing-library/react')
require('@testing-library/jest-dom')
const Page = require('../../pages/skills/[name]').default

const PROPS = {
  manifest: { name: 'compliance', version: '1.1.0', description: 'Compliance workflow.', tags: ['audit'], frameworks: ['nist-csf'],
    phases: [{ id: 'scope-definition', tokens: 1234, auto: false }, { id: 'live-threat-intel', tokens: 184, auto: true }] },
  family: { key: 'governance', label: 'Governance & Risk' },
  scopeHtml: '<ul><li>Use only on systems you own or are explicitly authorized to assess.</li></ul>',
  flatPrompt: '> Intel as of 2026-08-18\n\n# Compliance',
  intelAsOf: '2026-08-18',
  download: { prompt: '/downloads/prompts/compliance.md', zip: '/downloads/skills/compliance.zip', promptBytes: 31000, zipBytes: 9000 },
  packTabs: [{ id: 'codex', label: 'Codex', steps: [{ label: 'shell', code: 'npx aegis-skills install --platform codex' }] }]
}

test('renders description, phases, scope, downloads and install', () => {
  render(React.createElement(Page, PROPS))
  expect(screen.getByRole('heading', { level: 1, name: 'compliance' })).toBeInTheDocument()
  expect(screen.getByText('Compliance workflow.')).toBeInTheDocument()
  expect(screen.getByText('scope-definition')).toBeInTheDocument()
  expect(screen.getByText('LIVE')).toBeInTheDocument()
  expect(screen.getByText(/explicitly authorized/)).toBeInTheDocument()
  expect(screen.getByText(/Intel as of 2026-08-18/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'COPY PROMPT' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /download \.zip/i })).toHaveAttribute('href', '/downloads/skills/compliance.zip')
  expect(screen.getByRole('link', { name: /download \.md/i })).toHaveAttribute('href', '/downloads/prompts/compliance.md')
  expect(screen.getByText('npx aegis-skills install --platform codex')).toBeInTheDocument()
  expect(document.body.textContent).not.toMatch(/ChatGPT Action|openai-action/)
})
