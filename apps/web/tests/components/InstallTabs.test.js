/**
 * @jest-environment jsdom
 */
'use strict'

const React = require('react')
const { render, screen } = require('@testing-library/react')
const userEvent = require('@testing-library/user-event').default
require('@testing-library/jest-dom')
const InstallTabs = require('../../components/InstallTabs')

const TABS = [
  { id: 'claude', label: 'Claude Code', steps: [{ text: 'Inside Claude Code:' }, { label: 'shell', code: '/plugin install aegis-skills@aegis-skills' }] },
  { id: 'codex', label: 'Codex', steps: [{ label: 'shell', code: 'npx aegis-skills install --platform codex' }] }
]

test('shows the first tab by default with its note and code', () => {
  render(React.createElement(InstallTabs, { tabs: TABS }))
  expect(screen.getByRole('tab', { name: 'Claude Code' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByText('Inside Claude Code:')).toBeInTheDocument()
  expect(screen.getByText('/plugin install aegis-skills@aegis-skills')).toBeInTheDocument()
})

test('switches tabs', async () => {
  render(React.createElement(InstallTabs, { tabs: TABS }))
  await userEvent.setup().click(screen.getByRole('tab', { name: 'Codex' }))
  expect(screen.getByText('npx aegis-skills install --platform codex')).toBeInTheDocument()
  expect(screen.queryByText('Inside Claude Code:')).not.toBeInTheDocument()
})

test('flags tabs that are only available after the first release', async () => {
  const tabs = [{ ...TABS[0], availability: 'after-first-release' }, TABS[1]]
  render(React.createElement(InstallTabs, { tabs }))
  expect(screen.getByText(/Available after the first release/)).toBeInTheDocument()
  await userEvent.setup().click(screen.getByRole('tab', { name: 'Codex' }))
  expect(screen.queryByText(/Available after the first release/)).not.toBeInTheDocument()
})

test('renders one copy button per code block and nothing for empty tabs', () => {
  const { container } = render(React.createElement(InstallTabs, { tabs: TABS }))
  expect(screen.getAllByRole('button', { name: 'COPY' })).toHaveLength(1)
  expect(render(React.createElement(InstallTabs, { tabs: [] })).container.innerHTML).toBe('')
  expect(container.textContent).not.toMatch(/ChatGPT Action/)
})

test('in-development tabs show the pill and the honest Themis note, not the after-first-release note', async () => {
  const tabs = [{ ...TABS[0], availability: 'in-development' }, TABS[1]]
  const { container } = render(React.createElement(InstallTabs, { tabs }))
  expect(screen.getByText('In development')).toBeInTheDocument()
  expect(container.querySelector('.install-indev p').textContent).toBe('Themis is being matured locally and is not published yet. It will be announced here and is not available through AI directories yet. You can run it today from the repository — see the Themis docs.')
  expect(screen.getByRole('link', { name: 'Themis docs' })).toHaveAttribute('href', '/docs/themis')
  expect(screen.queryByText(/Available after the first release/)).not.toBeInTheDocument()
  await userEvent.setup().click(screen.getByRole('tab', { name: 'Codex' }))
  expect(screen.queryByText('In development')).not.toBeInTheDocument()
})
