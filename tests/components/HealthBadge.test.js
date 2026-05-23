/** @jest-environment jsdom */
'use strict'

const React = require('react')
const { render, screen } = require('@testing-library/react')
require('@testing-library/jest-dom')

const HealthBadge = require('../../components/HealthBadge')

describe('HealthBadge', () => {
  test('renders green badge for score >= 0.90', () => {
    render(React.createElement(HealthBadge, { score: 0.95 }))
    const badge = screen.getByText('95%')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toMatch(/green|emerald/)
  })

  test('renders amber badge for score >= 0.75 and < 0.90', () => {
    render(React.createElement(HealthBadge, { score: 0.80 }))
    const badge = screen.getByText('80%')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toMatch(/amber|yellow/)
  })

  test('renders red badge for score < 0.75', () => {
    render(React.createElement(HealthBadge, { score: 0.60 }))
    const badge = screen.getByText('60%')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toMatch(/red/)
  })

  test('renders nothing when score is undefined', () => {
    const { container } = render(React.createElement(HealthBadge, { score: undefined }))
    expect(container.firstChild).toBeNull()
  })

  test('renders nothing when score is null', () => {
    const { container } = render(React.createElement(HealthBadge, { score: null }))
    expect(container.firstChild).toBeNull()
  })

  test('renders score as percentage integer (no decimals)', () => {
    render(React.createElement(HealthBadge, { score: 0.876 }))
    expect(screen.getByText('88%')).toBeInTheDocument()
  })

  test('has aria-label for accessibility', () => {
    render(React.createElement(HealthBadge, { score: 0.92 }))
    const badge = screen.getByText('92%')
    expect(badge).toHaveAttribute('aria-label', 'Health score: 92%')
  })
})
