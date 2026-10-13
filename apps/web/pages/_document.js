'use strict'

const React = require('react')
const { Html, Head, Main, NextScript } = require('next/document')

const h = React.createElement

// Display (teimer-web) and body (legitima) come from the Adobe Fonts kit below; Red Hat Mono is
// self-hosted (@font-face in styles/globals.css, files in public/fonts). The CSP allows
// use.typekit.net and p.typekit.net (styles) and use.typekit.net (font files). See docs/design/FONTS.md.
const KIT_URL = 'https://use.typekit.net/pww4pkx.css'

// Applies a saved dark theme before first paint so there is no flash. Light is the default
// and the OS colour-scheme setting is never read: dark only appears after the visitor
// flips the toggle (the choice is stored under 'aegis-theme').
const THEME_SCRIPT = "try{if(localStorage.getItem('aegis-theme')==='dark'){var d=document.documentElement;d.setAttribute('data-theme','dark');var m=document.querySelector('meta[name=color-scheme]');if(m)m.setAttribute('content','dark')}}catch(e){}"

function Document () {
  return h(Html, { lang: 'en' },
    h(Head, null,
      h('meta', { name: 'color-scheme', content: 'light' }),
      // favicon: the dark Aegis mark on a navy tile, so it reads in light and dark tabs (.ico for 16/32/48, PNG for the rest)
      h('link', { rel: 'icon', href: '/favicon.ico', sizes: '48x48' }),
      h('link', { rel: 'icon', href: '/favicon-32.png', type: 'image/png', sizes: '32x32' }),
      h('link', { rel: 'icon', href: '/icon-192.png', type: 'image/png', sizes: '192x192' }),
      h('link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' }),
      h('link', { rel: 'preconnect', href: 'https://use.typekit.net' }), // the kit stylesheet (no-cors)
      h('link', { rel: 'preconnect', href: 'https://use.typekit.net', crossOrigin: 'anonymous' }), // the font files (cors)
      h('link', { rel: 'preconnect', href: 'https://p.typekit.net' }),
      h('link', { rel: 'stylesheet', href: KIT_URL }),
      h('link', { rel: 'preload', href: '/fonts/red-hat-mono-latin-400-normal.woff2', as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' }),
      h('script', { dangerouslySetInnerHTML: { __html: THEME_SCRIPT } })),
    h('body', null, h(Main), h(NextScript)))
}

module.exports = Document
module.exports.default = Document
