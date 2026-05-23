/** @jest-environment jsdom */
'use strict'

const React = require('react')
const { render, screen } = require('@testing-library/react')
require('@testing-library/jest-dom')

const SkillCard = require('../../components/SkillCard')

describe('SkillCard — health badge', () => {
  test('renders HealthBadge when healthScore prop provided', () => {
    const skill = {
      name: 'test-skill',
      description: 'Test description.',
      tags: [],
      frameworks: [],
      phases: 3
    }
    render(React.createElement(SkillCard, { skill, healthScore: 0.92 }))
    expect(screen.getByText('92%')).toBeInTheDocument()
  })

  test('does not render health badge when healthScore is undefined', () => {
    const skill = {
      name: 'test-skill',
      description: 'Test description.',
      tags: [],
      frameworks: [],
      phases: 3
    }
    render(React.createElement(SkillCard, { skill }))
    expect(screen.queryByText(/\d+%/)).toBeNull()
  })
})
