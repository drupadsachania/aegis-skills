/**
 * @jest-environment jsdom
 */
'use strict'

const React = require('react')
const { render, screen } = require('@testing-library/react')
require('@testing-library/jest-dom')
const PathMatrix = require('../../components/PathMatrix')
const { PATHS } = require('../../lib/install-commands')

test('one row per path with a link to its section', () => {
  render(React.createElement(PathMatrix, { paths: PATHS }))
  expect(screen.getAllByRole('row')).toHaveLength(PATHS.length + 1)
  expect(screen.getByText('Themis standalone')).toBeInTheDocument()
  const links = screen.getAllByRole('link', { name: /set up/i })
  expect(links.map(a => a.getAttribute('href'))).toEqual(PATHS.map(p => `/paths#${p.id}`))
})
