/** @jest-environment jsdom */
'use strict'

const React = require('react')
const { render, screen } = require('@testing-library/react')
require('@testing-library/jest-dom')

const HealthBadge = require('../../components/HealthBadge')

describe('HealthBadge', () => {
  // The badge shows a status dot (first child) whose colour depends on the score tier.
  const dotStyle = badge => badge.firstChild.getAttribute('style')

  test('renders a full-strength gold dot for score >= 0.75', () => {
    render(React.createElement(HealthBadge, { score: 0.95 }))
    const badge = screen.getByText('95%')
    expect(badge).toBeInTheDocument()
    expect(dotStyle(badge)).toMatch(/var\(--gold\)/)
  })

  test('renders a dimmed gold dot for score >= 0.50 and < 0.75', () => {
    render(React.createElement(HealthBadge, { score: 0.60 }))
    const badge = screen.getByText('60%')
    expect(badge).toBeInTheDocument()
    expect(dotStyle(badge)).toMatch(/rgba\(227,\s*189,\s*72,\s*0\.4\)/)
  })

  test('renders a muted dot for score < 0.50', () => {
    render(React.createElement(HealthBadge, { score: 0.30 }))
    const badge = screen.getByText('30%')
    expect(badge).toBeInTheDocument()
    expect(dotStyle(badge)).toMatch(/var\(--muted\)/)
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
