/**
 * @jest-environment jsdom
 */
'use strict'

const fs = require('fs')
const path = require('path')
const React = require('react')
const { render, screen } = require('@testing-library/react')
require('@testing-library/jest-dom')
const StatusPill = require('../../components/StatusPill')

test('the pill carries a text label (never colour-only) and a decorative dot', () => {
  const { container } = render(React.createElement(StatusPill, { status: 'in-development' }))
  expect(screen.getByText('In development')).toBeInTheDocument()
  expect(container.querySelector('.status-pill-themis')).not.toBeNull()
  expect(container.querySelector('.status-pill-dot')).toHaveAttribute('aria-hidden', 'true')
})

test('an unknown status renders nothing', () => {
  expect(render(React.createElement(StatusPill, { status: 'live' })).container.innerHTML).toBe('')
})

test('the stylesheet uses tokens only and keeps the label at 12px or more', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', '..', 'styles', 'globals.css'), 'utf8')
  const block = css.slice(css.indexOf('.status-pill {'), css.indexOf('.install-indev {'))
  expect(block).toContain('var(--k-color-themis-soft)')
  expect(block).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i)
  expect(block).toMatch(/font-size: 12px/)
  expect(block).not.toMatch(/transition|animation/)
})
