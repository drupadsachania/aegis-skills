/**
 * @jest-environment jsdom
 */
'use strict'

const React = require('react')
const { render, screen, act } = require('@testing-library/react')
const userEvent = require('@testing-library/user-event').default
require('@testing-library/jest-dom')
const Layout = require('../../components/Layout')

function mockMatchMedia (darkOS, reduce = true) {
  window.matchMedia = jest.fn(query => ({
    matches: /prefers-color-scheme: dark/.test(query) ? darkOS : (/prefers-reduced-motion: reduce/.test(query) ? reduce : false),
    media: query,
    addEventListener () {},
    removeEventListener () {},
    addListener () {},
    removeListener () {}
  }))
}

beforeEach(() => {
  document.documentElement.removeAttribute('data-theme')
  try { window.localStorage.clear() } catch (e) { /* ignore */ }
})

test('default theme is light even when the OS prefers dark', () => {
  mockMatchMedia(true)
  render(React.createElement(Layout, { title: 'T' }, React.createElement('p', null, 'x')))
  const toggle = screen.getByRole('button', { name: 'Dark theme' })
  expect(toggle).toHaveAttribute('aria-pressed', 'false')
  expect(document.documentElement.getAttribute('data-theme')).toBeNull()
})

test('the toggle is the only way to dark, persists it, and flips back', async () => {
  mockMatchMedia(true)
  render(React.createElement(Layout, { title: 'T' }, React.createElement('p', null, 'x')))
  const user = userEvent.setup()
  const toggle = screen.getByRole('button', { name: 'Dark theme' })
  await user.click(toggle)
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  expect(window.localStorage.getItem('aegis-theme')).toBe('dark')
  expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await user.click(toggle)
  expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  expect(toggle).toHaveAttribute('aria-pressed', 'false')
})

test('a saved dark choice that the document script applied is reflected by the toggle', () => {
  mockMatchMedia(false)
  document.documentElement.setAttribute('data-theme', 'dark')
  render(React.createElement(Layout, { title: 'T' }, React.createElement('p', null, 'x')))
  expect(screen.getByRole('button', { name: 'Dark theme' })).toHaveAttribute('aria-pressed', 'true')
})

test('uses View Transitions for the crossfade when available and motion is allowed', async () => {
  mockMatchMedia(false, false)
  const start = jest.fn(cb => { cb() })
  document.startViewTransition = start
  render(React.createElement(Layout, { title: 'T' }, React.createElement('p', null, 'x')))
  await act(async () => { await userEvent.setup().click(screen.getByRole('button', { name: 'Dark theme' })) })
  expect(start).toHaveBeenCalledTimes(1)
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  delete document.startViewTransition
})

test('storage failures do not break the toggle', async () => {
  mockMatchMedia(false)
  const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied') })
  render(React.createElement(Layout, { title: 'T' }, React.createElement('p', null, 'x')))
  await userEvent.setup().click(screen.getByRole('button', { name: 'Dark theme' }))
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  spy.mockRestore()
})
