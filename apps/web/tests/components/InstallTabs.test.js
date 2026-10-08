/**
 * @jest-environment jsdom
 */
'use strict'

const React = require('react')
const { render, screen } = require('@testing-library/react')
const userEvent = require('@testing-library/user-event').default
require('@testing-library/jest-dom')

const InstallTabs = require('../../components/InstallTabs')

const MCP_URL = 'https://aegis-skills.vercel.app/api/mcp'
const PROPS = {
  name: 'test-skill',
  systemPrompt: 'You are a test assistant.',
  mcpUrl: MCP_URL,
  mcpConfig: JSON.stringify({ mcpServers: { aegis: { type: 'http', url: MCP_URL } } })
}

describe('InstallTabs', () => {
  test('renders the System Prompt tab by default', () => {
    render(React.createElement(InstallTabs, PROPS))
    expect(screen.getByRole('button', { name: 'System Prompt' })).toBeInTheDocument()
    expect(screen.getAllByText(/You are a test assistant/).length).toBeGreaterThan(0)
  })

  test('switches to the MCP tab', async () => {
    render(React.createElement(InstallTabs, PROPS))
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /^mcp$/i }))
    expect(screen.getAllByText(/aegis-skills\.vercel\.app\/api\/mcp/).length).toBeGreaterThan(0)
  })

  test('offers no ChatGPT Action tab', () => {
    render(React.createElement(InstallTabs, PROPS))
    expect(screen.queryByRole('button', { name: /chatgpt action/i })).toBeNull()
  })

  test('lists both platforms in the summary table', () => {
    render(React.createElement(InstallTabs, PROPS))
    expect(screen.getByText('Any chat UI')).toBeInTheDocument()
    expect(screen.getByText('MCP clients')).toBeInTheDocument()
  })
})
