/**
 * @jest-environment jsdom
 */
'use strict'

const React = require('react')
const { render, screen } = require('@testing-library/react')
require('@testing-library/jest-dom')
const Layout = require('../../components/Layout')

test('nav links, footer licence and children', () => {
  render(React.createElement(Layout, { title: 'T' }, React.createElement('p', null, 'child')))
  const nav = screen.getByRole('navigation', { name: 'Main' })
  const hrefs = Array.from(nav.querySelectorAll('a')).map(a => a.getAttribute('href'))
  expect(hrefs).toEqual(['/', '/skills', '/paths', '/themis', '/docs', 'https://github.com/drupadsachania/aegis-skills', '/paths'])
  expect(screen.getByRole('link', { name: 'Get started' })).toHaveAttribute('href', '/paths')
  // Hosted MCP, Security and License stay reachable from the footer
  expect(screen.getByRole('link', { name: 'Hosted MCP' })).toHaveAttribute('href', '/mcp')
  expect(screen.getByText('Apache-2.0 OR MIT')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Security' })).toHaveAttribute('href', '/security')
  expect(screen.getByRole('link', { name: 'License' })).toHaveAttribute('href', '/license')
  expect(screen.getByText('child')).toBeInTheDocument()
})
