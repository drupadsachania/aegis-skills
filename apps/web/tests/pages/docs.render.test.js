/**
 * @jest-environment jsdom
 */
'use strict'

const React = require('react')
const { render, screen } = require('@testing-library/react')
require('@testing-library/jest-dom')
const Hub = require('../../pages/docs/index').default
const DocPage = require('../../pages/docs/[...slug]').default

const NAV = [
  { key: 'aegis', title: 'Aegis', blurb: 'b', pages: [{ slug: 'index', title: 'Aegis', href: '/docs/aegis' }, { slug: 'install', title: 'Install Aegis', href: '/docs/aegis/install' }] },
  { key: 'themis', title: 'Themis', blurb: 'b', pages: [] }
]

test('hub lists sections and pages', () => {
  render(React.createElement(Hub, { nav: NAV }))
  expect(screen.getByRole('heading', { level: 1, name: 'Docs' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Install Aegis' })).toHaveAttribute('href', '/docs/aegis/install')
})

test('doc page renders html, marks the current nav item and offers an edit link', () => {
  render(React.createElement(DocPage, { nav: NAV, title: 'Install Aegis', html: '<h1>Install Aegis</h1><p>body</p>',
    href: '/docs/aegis/install', editUrl: 'https://github.com/drupadsachania/aegis-skills/edit/main/docs/aegis/install.md' }))
  expect(screen.getByText('body')).toBeInTheDocument()
  expect(document.querySelector('a[aria-current="page"]').getAttribute('href')).toBe('/docs/aegis/install')
  expect(screen.getByRole('link', { name: /edit this page/i })).toHaveAttribute('href', expect.stringContaining('/edit/main/docs/aegis/install.md'))
})
