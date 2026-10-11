'use strict'

const React = require('react')
const { Html, Head, Main, NextScript } = require('next/document')

const h = React.createElement

// Newsreader (display), Red Hat Mono (labels, nav) and IBM Plex Sans (body) are self-hosted
// (public/fonts, SIL OFL, declared with @font-face in styles/globals.css). The site loads
// nothing from a third party. The two weights above the fold are preloaded.
const PRELOAD_FONTS = ['newsreader-latin-wght-normal.woff2', 'ibm-plex-sans-latin-400-normal.woff2']

// Applies a saved dark theme before first paint so there is no flash. Light is the default
// and the OS colour-scheme setting is never read: dark only appears after the visitor
// flips the toggle (the choice is stored under 'aegis-theme').
const THEME_SCRIPT = "try{if(localStorage.getItem('aegis-theme')==='dark'){var d=document.documentElement;d.setAttribute('data-theme','dark');var m=document.querySelector('meta[name=color-scheme]');if(m)m.setAttribute('content','dark')}}catch(e){}"

function Document () {
  return h(Html, { lang: 'en' },
    h(Head, null,
      h('meta', { name: 'color-scheme', content: 'light' }),
      // favicon: simplified Aegis shield (SVG for modern browsers, .ico fallback), cream plate for dark tabs
      h('link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }),
      h('link', { rel: 'icon', href: '/favicon.ico', sizes: '48x48' }),
      h('link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' }),
      ...PRELOAD_FONTS.map(f => h('link', { key: f, rel: 'preload', href: `/fonts/${f}`, as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' })),
      h('script', { dangerouslySetInnerHTML: { __html: THEME_SCRIPT } })),
    h('body', null, h(Main), h(NextScript)))
}

module.exports = Document
module.exports.default = Document
