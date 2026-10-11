'use strict'

const React = require('react')
const { Html, Head, Main, NextScript } = require('next/document')

const h = React.createElement

// Newsreader (display), Red Hat Mono (labels, nav) and IBM Plex Sans (body).
// Loaded as a <link> with display=swap; the CSP allows fonts.googleapis.com (styles)
// and fonts.gstatic.com (font files).
const FONTS_URL = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,300..600;1,6..72,300..600&family=Red+Hat+Mono:wght@400;500;600&display=swap'

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
      h('link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }),
      h('link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' }),
      h('link', { rel: 'stylesheet', href: FONTS_URL }),
      h('script', { dangerouslySetInnerHTML: { __html: THEME_SCRIPT } })),
    h('body', null, h(Main), h(NextScript)))
}

module.exports = Document
module.exports.default = Document
