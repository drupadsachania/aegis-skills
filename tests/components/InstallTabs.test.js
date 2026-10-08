/**
 * @jest-environment jsdom
 */
'use strict'

const React = require('react')
const { render, screen } = require('@testing-library/react')
const userEvent = require('@testing-library/user-event').default
require('@testing-library/jest-dom')

const InstallTabs = require('../../components/InstallTabs')

const PROPS = {
  name: 'test-skill',
  systemPrompt: 'You are a test assistant.',
  openaiAction: '{"openapi":"3.0"}',
  mcpUrl: 'https://aegis-skills.vercel.app/api/test-skill/manifest',
  mcpConfig: '{"mcpServers":{"test-skill":{"url":"https://aegis-skills.vercel.app/api/test-skill/manifest"}}}'
}

describe('InstallTabs', () => {
  test('renders System Prompt tab by default', () => {
    render(React.createElement(InstallTabs, PROPS))
    expect(screen.getByText('System Prompt')).toBeInTheDocument()
    expect(screen.getByText(/You are a test assistant/)).toBeInTheDocument()
  })

  test('switches to ChatGPT Action tab', async () => {
    render(React.createElement(InstallTabs, PROPS))
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /chatgpt action/i }))
    expect(screen.getByText(/"openapi":"3.0"/)).toBeInTheDocument()
  })

  test('switches to MCP tab', async () => {
    render(React.createElement(InstallTabs, PROPS))
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /^mcp$/i }))
    const urlElements = screen.getAllByText(/aegis-skills\.vercel\.app/)
    expect(urlElements.length).toBeGreaterThan(0)
  })

  test('always shows the all-platforms table, whichever tab is active', async () => {
    render(React.createElement(InstallTabs, PROPS))
    const user = userEvent.setup()
    expect(screen.getByText('Platform')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^mcp$/i }))
    expect(screen.getByText('Platform')).toBeInTheDocument()
  })
})
