/**
 * @jest-environment jsdom
 */
'use strict'

const React = require('react')
const { render, screen, act, waitFor } = require('@testing-library/react')
const userEvent = require('@testing-library/user-event').default
require('@testing-library/jest-dom')

const CopyButton = require('../../components/CopyButton')

describe('CopyButton', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('renders with initial label', () => {
    render(React.createElement(CopyButton, { text: 'hello', label: 'Copy' }))
    expect(screen.getByRole('button')).toHaveTextContent('Copy')
  })

  test('copies text to clipboard on click', async () => {
    render(React.createElement(CopyButton, { text: 'hello world', label: 'Copy' }))
    const user = userEvent.setup({ delay: null })
    // Spy on clipboard AFTER user-event setup (it replaces navigator.clipboard in setup)
    const writeSpy = jest.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    await user.click(screen.getByRole('button'))
    expect(writeSpy).toHaveBeenCalledWith('hello world')
  })

  test('shows tick for 2 seconds after copy, then reverts', async () => {
    render(React.createElement(CopyButton, { text: 'hello', label: 'Copy' }))
    const user = userEvent.setup({ delay: null })
    jest.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    await user.click(screen.getByRole('button'))
    // Wait for state update after promise resolves
    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveTextContent('✓')
    })
    act(() => { jest.advanceTimersByTime(2000) })
    expect(screen.getByRole('button')).toHaveTextContent('Copy')
  })
})
