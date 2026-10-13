/**
 * @jest-environment jsdom
 */
'use strict'

const { initReveal } = require('../../components/reveal')

function setup (html, { reduce = false, io = true, top = 2000 } = {}) {
  document.body.innerHTML = html
  const observers = []
  const win = {
    document,
    innerHeight: 800,
    matchMedia: q => ({ matches: reduce && /reduce/.test(q) }),
    IntersectionObserver: io ? class {
      constructor (cb) { this.cb = cb; this.els = new Set(); observers.push(this) }
      observe (el) { this.els.add(el) }
      unobserve (el) { this.els.delete(el) }
      disconnect () { this.els.clear() }
    } : undefined
  }
  document.querySelectorAll('[data-reveal]').forEach((el, i) => {
    el.getBoundingClientRect = () => ({ top: el.hasAttribute('data-above') ? 100 : top + i })
  })
  return { win, observers }
}

const HTML = '<div><p data-reveal id="a"></p><p data-reveal id="b"></p><p data-reveal id="c"></p><p data-reveal data-above id="top"></p></div>'

test('marks only below-the-fold elements pending; in-view ones are never hidden', () => {
  const { win } = setup(HTML)
  initReveal({ win })
  expect(document.getElementById('a').dataset.revealState).toBe('pending')
  expect(document.getElementById('top').hasAttribute('data-reveal-state')).toBe(false)
})

test('reveals on intersect with 60ms stagger per batch and unobserves', () => {
  const { win, observers } = setup(HTML)
  initReveal({ win })
  const io = observers[0]
  const els = ['a', 'b', 'c'].map(id => document.getElementById(id))
  io.cb(els.map(target => ({ target, isIntersecting: true })))
  expect(els.map(e => e.dataset.revealState)).toEqual(['in', 'in', 'in'])
  expect(els.map(e => e.style.getPropertyValue('--reveal-delay'))).toEqual(['0ms', '60ms', '120ms'])
  expect(io.els.size).toBe(0)
})

test('caps the stagger at 8 steps', () => {
  const many = Array.from({ length: 12 }, (_, i) => `<i data-reveal id="n${i}"></i>`).join('')
  const { win, observers } = setup(many)
  initReveal({ win })
  const els = Array.from(document.querySelectorAll('[data-reveal]'))
  observers[0].cb(els.map(target => ({ target, isIntersecting: true })))
  expect(els[11].style.getPropertyValue('--reveal-delay')).toBe('420ms')
})

test('does nothing under prefers-reduced-motion: reduce', () => {
  const { win, observers } = setup(HTML, { reduce: true })
  initReveal({ win })
  expect(observers.length).toBe(0)
  expect(document.querySelectorAll('[data-reveal-state]').length).toBe(0)
})

test('does nothing without IntersectionObserver (content stays visible)', () => {
  const { win } = setup(HTML, { io: false })
  initReveal({ win })
  expect(document.querySelectorAll('[data-reveal-state]').length).toBe(0)
})

test('cleanup restores elements', () => {
  const { win } = setup(HTML)
  const stop = initReveal({ win })
  stop()
  expect(document.querySelectorAll('[data-reveal-state]').length).toBe(0)
})

test('reveals elements that were scrolled past while hidden', () => {
  const { win, observers } = setup(HTML)
  initReveal({ win })
  const a = document.getElementById('a')
  observers[0].cb([{ target: a, isIntersecting: false, boundingClientRect: { top: -300 } }])
  expect(a.dataset.revealState).toBe('in')
  const b = document.getElementById('b')
  observers[0].cb([{ target: b, isIntersecting: false, boundingClientRect: { top: 900 } }])
  expect(b.dataset.revealState).toBe('pending')
})
