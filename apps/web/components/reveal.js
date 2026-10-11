'use strict'

const React = require('react')

/**
 * Reveal on scroll (docs/design/motion.md 4.1/4.2).
 *
 * Server HTML is fully visible. After mount, elements marked `data-reveal` (and `.prose h2`)
 * that start BELOW the fold get data-reveal-state="pending" (CSS: opacity 0, 8px down) and
 * flip to "in" when they enter the viewport (CSS: 480 ms decelerate animation). Elements
 * already in view, no JS, no IntersectionObserver or prefers-reduced-motion: reduce mean
 * nothing is ever hidden. One observer per page, unobserved after the first reveal.
 *
 * Stagger: elements that become visible in the same observer callback get 60 ms steps
 * (--reveal-delay), capped at 8, so a row of cards ripples in and a lone element does not wait.
 */
const SELECTOR = '[data-reveal], .prose h2'
const STEP_MS = 60
const MAX_STEPS = 8

function initReveal (opts) {
  const win = (opts && opts.win) || (typeof window !== 'undefined' ? window : null)
  const doc = (opts && opts.root) || (win && win.document)
  if (!win || !doc) return function noop () {}
  const reduce = typeof win.matchMedia === 'function' && win.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce || typeof win.IntersectionObserver !== 'function') return function noop () {}

  const els = Array.from(doc.querySelectorAll(SELECTOR))
  if (!els.length) return function noop () {}
  const viewportH = win.innerHeight || (doc.documentElement && doc.documentElement.clientHeight) || 0

  const io = new win.IntersectionObserver(entries => {
    let i = 0
    for (const entry of entries) {
      // also reveal anything scrolled past while pending (e.g. a fast jump), so scrolling back never shows holes
      const pastTop = !entry.isIntersecting && entry.boundingClientRect && entry.boundingClientRect.top < 0
      if (!entry.isIntersecting && !pastTop) continue
      const el = entry.target
      el.style.setProperty('--reveal-delay', Math.min(i, MAX_STEPS - 1) * STEP_MS + 'ms')
      el.setAttribute('data-reveal-state', 'in')
      io.unobserve(el)
      i++
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0 })

  const hidden = []
  for (const el of els) {
    // Anything already on screen (or scrolled past, e.g. after a #hash jump) is never hidden.
    if (el.getBoundingClientRect().top <= viewportH) continue
    el.setAttribute('data-reveal-state', 'pending')
    hidden.push(el)
    io.observe(el)
  }

  return function cleanup () {
    io.disconnect()
    for (const el of hidden) {
      el.removeAttribute('data-reveal-state')
      el.style.removeProperty('--reveal-delay')
    }
  }
}

function useReveal () {
  React.useEffect(() => initReveal(), [])
}

module.exports = { initReveal, useReveal, SELECTOR }
