'use strict'

const React = require('react')
const Head = require('next/head').default || require('next/head')

const { useState, useEffect, useRef, useCallback } = React
const h = React.createElement

const SITE = 'Aegis + Themis'
const DEFAULT_DESCRIPTION = 'Open cybersecurity skill pack and a governed SOC agent that runs on your own AI. Apache-2.0 OR MIT.'
const REPO_URL = 'https://github.com/drupadsachania/aegis-skills'
const THEME_KEY = 'aegis-theme'

const NAV = [
  { href: '/skills', label: 'Skills' },
  { href: '/paths', label: 'Paths' },
  { href: '/themis', label: 'Themis' },
  { href: '/docs', label: 'Docs' }
]

const FOOTER_COLUMNS = [
  { title: 'Product', links: [
    { href: '/skills', label: 'Skills' },
    { href: '/paths', label: 'Paths' },
    { href: '/themis', label: 'Themis' },
    { href: '/mcp', label: 'Hosted MCP' }
  ] },
  { title: 'Docs', links: [
    { href: '/docs', label: 'All docs' },
    { href: '/docs/aegis', label: 'Aegis' },
    { href: '/docs/themis', label: 'Themis agent' },
    { href: '/docs/web', label: 'This website' }
  ] },
  { title: 'Trust', links: [
    { href: '/security', label: 'Security' },
    { href: '/license', label: 'License' },
    { href: REPO_URL, label: 'GitHub', external: true },
    { href: 'https://kairo-foundation.org', label: 'Kairo Foundation', external: true }
  ] }
]

const FOCUSABLE = 'a[href], button:not([disabled])'

function BrandMark () {
  return h('svg', { className: 'brand-mark', viewBox: '0 0 32 32', 'aria-hidden': 'true', focusable: 'false' },
    h('rect', { className: 'mk-a', x: 4, y: 9, width: 14, height: 14, rx: 3, transform: 'rotate(45 11 16)' }),
    h('circle', { className: 'mk-t', cx: 21.5, cy: 16, r: 8 }))
}

function Icon ({ d, children }) {
  return h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true', focusable: 'false' }, children)
}

// pages-router pathname; null when rendered outside Next (unit tests)
function useCurrentPath () {
  try { return require('next/router').useRouter().pathname } catch (e) { return null }
}

const isActive = (path, href) => !!path && (path === href || path.startsWith(href + '/'))

function currentTheme () {
  const attr = document.documentElement.getAttribute('data-theme')
  if (attr === 'light' || attr === 'dark') return attr
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function ThemeToggle () {
  const [dark, setDark] = useState(false)
  useEffect(() => { setDark(currentTheme() === 'dark') }, [])
  const flip = () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    try { window.localStorage.setItem(THEME_KEY, next) } catch (e) { /* storage unavailable */ }
    setDark(next === 'dark')
  }
  return h('button', { type: 'button', className: 'icon-btn theme-toggle', onClick: flip, 'aria-pressed': dark, 'aria-label': 'Dark theme' },
    h('span', { className: 'i-sun' }, h(Icon, null,
      h('circle', { cx: 12, cy: 12, r: 4 }),
      h('path', { d: 'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4' }))),
    h('span', { className: 'i-moon' }, h(Icon, null, h('path', { d: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z' }))))
}

function MobileMenu ({ path, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    const root = ref.current
    const items = () => Array.from(root.querySelectorAll(FOCUSABLE))
    const first = items()[0]
    if (first) first.focus()
    const onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
      if (e.key !== 'Tab') return
      const list = items()
      if (!list.length) return
      const a = list[0]
      const z = list[list.length - 1]
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus() }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus() }
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  return h('div', { id: 'mobile-menu', className: 'mobile-menu', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Site menu', ref },
    h('div', { className: 'mobile-menu-top' },
      h('a', { href: '/', className: 'nav-brand' }, h(BrandMark), h('span', { className: 'brand-word' }, 'Aegis', h('span', { className: 'sep' }, '·'), 'Themis')),
      h('button', { type: 'button', className: 'icon-btn', onClick: onClose, 'aria-label': 'Close menu' },
        h(Icon, null, h('path', { d: 'M6 6l12 12M18 6L6 18' })))),
    h('ul', null,
      ...NAV.map(l => h('li', { key: l.href },
        h('a', { href: l.href, className: 'mm-link', 'aria-current': isActive(path, l.href) ? 'page' : undefined, onClick: onClose }, l.label, h('span', { className: 'arr', 'aria-hidden': 'true' }, '→')))),
      h('li', { key: 'gh' },
        h('a', { href: REPO_URL, className: 'mm-link', target: '_blank', rel: 'noopener noreferrer' }, 'GitHub', h('span', { className: 'arr', 'aria-hidden': 'true' }, '↗')))),
    h('div', { className: 'mm-more' },
      h('a', { href: '/mcp', onClick: onClose }, 'Hosted MCP'),
      h('a', { href: '/security', onClick: onClose }, 'Security'),
      h('a', { href: '/license', onClick: onClose }, 'License')),
    h('div', { className: 'mm-cta' }, h('a', { href: '/paths', className: 'btn-primary', onClick: onClose }, 'Get started')))
}

function Header () {
  const path = useCurrentPath()
  const [open, setOpen] = useState(false)
  const burger = useRef(null)
  const close = useCallback(() => {
    setOpen(false)
    if (burger.current) burger.current.focus()
  }, [])
  useEffect(() => {
    if (!open || !window.matchMedia) return undefined
    const mq = window.matchMedia('(min-width: 761px)')
    const onChange = e => { if (e.matches) setOpen(false) }
    mq.addEventListener ? mq.addEventListener('change', onChange) : mq.addListener(onChange)
    return () => { mq.removeEventListener ? mq.removeEventListener('change', onChange) : mq.removeListener(onChange) }
  }, [open])

  return h(React.Fragment, null, h('header', { className: 'site-header' },
    h('nav', { className: 'nav-root', 'aria-label': 'Main' },
      h('a', { href: '/', className: 'nav-brand' }, h(BrandMark), h('span', { className: 'brand-word' }, 'Aegis', h('span', { className: 'sep' }, '·'), 'Themis')),
      h('ul', { className: 'nav-links' },
        ...NAV.map(l => h('li', { key: l.href },
          h('a', { href: l.href, 'aria-current': isActive(path, l.href) ? 'page' : undefined }, l.label))),
        h('li', { key: 'github' },
          h('a', { href: REPO_URL, target: '_blank', rel: 'noopener noreferrer' }, 'GitHub ↗'))),
      h('div', { className: 'nav-actions' },
        h(ThemeToggle),
        h('a', { href: '/paths', className: 'btn-primary nav-cta' }, 'Get started'),
        h('button', {
          type: 'button',
          className: 'icon-btn nav-burger',
          ref: burger,
          'aria-expanded': open,
          'aria-controls': 'mobile-menu',
          'aria-label': 'Open menu',
          onClick: () => setOpen(true)
        }, h(Icon, null, h('path', { d: 'M4 8h16M4 16h16' })))))),
    // outside <header>: its backdrop-filter would otherwise become the containing block of the fixed overlay
    open ? h(MobileMenu, { path, onClose: close }) : null)
}

const external = (href, label) => h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, label)

function Footer () {
  return h('footer', { className: 'footer-root' },
    h('div', { className: 'footer-inner' },
      h('div', { className: 'footer-top' },
        h('div', { className: 'footer-brand-col' },
          h('a', { href: '/', className: 'footer-brand' }, h(BrandMark), h('span', null, 'Aegis ', h('em', null, '+ Themis'))),
          h('p', { className: 'footer-blurb' }, 'An open cybersecurity skill pack and a governed SOC agent, run on your own AI.')),
        ...FOOTER_COLUMNS.map(col => h('div', { key: col.title, className: 'footer-col' },
          h('h2', null, col.title),
          h('ul', null, ...col.links.map(l => h('li', { key: l.label },
            l.external ? external(l.href, l.label) : h('a', { href: l.href }, l.label))))))),
      h('div', { className: 'footer-legal' },
        h('span', null, SITE),
        h('span', { className: 'footer-copy' }, 'Apache-2.0 OR MIT'))))
}

function Layout ({ title, description, children }) {
  return h(
    'div',
    { className: 'page-root' },
    h(Head, null,
      h('title', null, title ? `${title} · ${SITE}` : SITE),
      h('meta', { name: 'description', content: description || DEFAULT_DESCRIPTION })),
    h('a', { href: '#main', className: 'skip-link' }, 'Skip to content'),
    h(Header),
    h('main', { id: 'main', tabIndex: -1 }, children),
    h(Footer)
  )
}

module.exports = Layout
module.exports.default = Layout
