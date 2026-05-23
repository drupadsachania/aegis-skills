/**
 * @jest-environment jsdom
 */
'use strict'

const React = require('react')
const { render, screen, act } = require('@testing-library/react')
const userEvent = require('@testing-library/user-event').default
require('@testing-library/jest-dom')

const CopyButton = require('../../components/CopyButton')

describe('CopyButton', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: jest.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true
    })
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
    await user.click(screen.getByRole('button'))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello world')
  })

  test('shows tick for 2 seconds after copy, then reverts', async () => {
    render(React.createElement(CopyButton, { text: 'hello', label: 'Copy' }))
    const user = userEvent.setup({ delay: null })
    await user.click(screen.getByRole('button'))
    expect(screen.getByRole('button')).toHaveTextContent('✓')
    act(() => { jest.advanceTimersByTime(2000) })
    expect(screen.getByRole('button')).toHaveTextContent('Copy')
  })
})
