/** @jest-environment jsdom */
'use strict'

const React = require('react')
const { render, screen } = require('@testing-library/react')
require('@testing-library/jest-dom')

const SkillCard = require('../../components/SkillCard')

// SkillCard renders a <tr> — must be inside a table for valid DOM
function renderInTable(element) {
  return render(
    React.createElement('table', null,
      React.createElement('tbody', null, element)
    )
  )
}

const skill = {
  name: 'test-skill',
  description: 'Test description.',
  tags: ['network'],
  frameworks: ['mitre-attack'],
  phases: 3
}

describe('SkillCard', () => {
  test('renders skill name as a link', () => {
    renderInTable(React.createElement(SkillCard, { skill }))
    expect(screen.getByRole('link', { name: 'test-skill' })).toBeInTheDocument()
  })

  test('renders description excerpt', () => {
    renderInTable(React.createElement(SkillCard, { skill }))
    expect(screen.getByText('Test description.')).toBeInTheDocument()
  })

  test('renders phase count', () => {
    renderInTable(React.createElement(SkillCard, { skill }))
    expect(screen.getByText('3 phases')).toBeInTheDocument()
  })

  test('renders health score number when healthScore provided', () => {
    renderInTable(React.createElement(SkillCard, { skill, healthScore: 92 }))
    expect(screen.getByText('92')).toBeInTheDocument()
  })

  test('renders em-dash when healthScore is undefined', () => {
    renderInTable(React.createElement(SkillCard, { skill }))
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  test('renders tags', () => {
    renderInTable(React.createElement(SkillCard, { skill }))
    expect(screen.getByText('network')).toBeInTheDocument()
  })

  test('renders framework tags', () => {
    renderInTable(React.createElement(SkillCard, { skill }))
    expect(screen.getByText('mitre-attack')).toBeInTheDocument()
  })
})
