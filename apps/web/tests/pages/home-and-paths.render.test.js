/**
 * @jest-environment jsdom
 */
'use strict'

const React = require('react')
const { render, screen } = require('@testing-library/react')
require('@testing-library/jest-dom')
const Home = require('../../pages/index').default
const Paths = require('../../pages/paths').default
const { PATHS } = require('../../lib/install-commands')

test('home positions the pack and links to every entry point', () => {
  render(React.createElement(Home, { skillCount: 24, familyCount: 5, paths: PATHS }))
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/your own AI/i)
  for (const href of ['/paths', '/skills', '/themis', '/mcp', '/docs', '/security']) {
    expect(document.querySelector(`a[href="${href}"]`)).not.toBeNull()
  }
  expect(screen.getByText('Themis standalone')).toBeInTheDocument()
  expect(document.body.textContent).not.toMatch(/ChatGPT Action|\/api\/(audit|exposure|themis)|@aegis-skills\/core|aegis compile/)
})

test('paths page has one section per path with install tabs', () => {
  render(React.createElement(Paths, { paths: PATHS }))
  for (const p of PATHS) expect(document.getElementById(p.id)).not.toBeNull()
  expect(screen.getAllByRole('tablist')).toHaveLength(PATHS.length)
  expect(screen.getByText('npx @aegis-skills/themis dashboard')).toBeInTheDocument()
})
