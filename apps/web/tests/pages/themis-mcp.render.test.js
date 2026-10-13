/**
 * @jest-environment jsdom
 */
'use strict'

const React = require('react')
const { render, screen } = require('@testing-library/react')
require('@testing-library/jest-dom')
const Themis = require('../../pages/themis').default
const Mcp = require('../../pages/mcp').default
const { PATHS, MCP_URL } = require('../../lib/install-commands')

const shots = [{ file: 'dashboard-run.png', alt: 'Run page', caption: 'Run', exists: false }]

test('themis page explains both modes, approvals and install', () => {
  render(React.createElement(Themis, { paths: PATHS, shots }))
  expect(screen.getByRole('heading', { level: 1, name: 'Themis' })).toBeInTheDocument()
  expect(screen.getByText('Themis on your AI')).toBeInTheDocument()
  expect(screen.getByText('Themis standalone')).toBeInTheDocument()
  expect(document.body.textContent).toMatch(/only a human can approve/i)
  expect(screen.getByText(/Screenshot pending: Run page/)).toBeInTheDocument()
  expect(document.body.textContent).not.toMatch(/\/api\/themis|POST \/api|createReactAgent/)
})

test('mcp page shows the endpoint, the three tools and connection tabs', () => {
  render(React.createElement(Mcp, { paths: PATHS }))
  expect(screen.getAllByText(MCP_URL).length).toBeGreaterThan(0)
  for (const t of ['list_skills', 'get_skill', 'get_skill_phase']) expect(document.body.textContent).toContain(t)
  expect(screen.getByRole('tab', { name: 'Claude.ai' })).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: 'ChatGPT' })).toBeInTheDocument()
})
