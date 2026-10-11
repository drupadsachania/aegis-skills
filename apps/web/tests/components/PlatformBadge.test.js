/**
 * @jest-environment jsdom
 */
'use strict'

const React = require('react')
const { render, screen } = require('@testing-library/react')
require('@testing-library/jest-dom')
const PlatformBadge = require('../../components/PlatformBadge')

test.each([['claude', 'Claude'], ['chatgpt', 'ChatGPT'], ['codex', 'Codex'], ['vscode', 'VS Code'], ['other-x', 'other-x']])(
  '%s → %s', (id, label) => {
    render(React.createElement(PlatformBadge, { platform: id }))
    expect(screen.getByText(label)).toBeInTheDocument()
  })
