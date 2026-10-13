'use strict'

/**
 * Logo components (see docs/design/LOGOS.md for the asset inventory and usage rules).
 *  - BrandIcon / BrandIcons: the small marks (96 px WebP) for 20-64 px use (nav, footer, eyebrows).
 *    Decorative by default (alt=""): the product name is always written next to them.
 *  - Logo: the large raster artwork (WebP).
 * Each piece of artwork has a light and a dark variant. Both are rendered and CSS shows the one that matches
 * the theme (.theme-light-only / .theme-dark-only, see globals.css), so the theme toggle never reloads an image.
 * Every <img> carries explicit width/height so nothing shifts while it loads.
 */
const React = require('react')

const h = React.createElement

const NAMES = { aegis: 'Aegis', themis: 'Themis' }

// intrinsic pixel sizes of the shipped WebP files
const MARK = { aegis: { w: 320, h: 278 }, themis: { w: 320, h: 280 } }
const LOCKUP = { aegis: { w: 640, h: 652 }, themis: { w: 640, h: 657 } }
const MARK_DARK = { aegis: { w: 320, h: 281 }, themis: { w: 320, h: 282 } }
const LOCKUP_DARK = { aegis: { w: 640, h: 653 }, themis: { w: 640, h: 657 } }

function BrandIcon ({ brand, size = 30, className = '' }) {
  const img = (theme, src) => h('img', {
    className: (`brand-icon theme-${theme}-only ` + className).trim(),
    src,
    alt: '',
    width: size,
    height: size,
    decoding: 'async'
  })
  return h(React.Fragment, null, img('light', `/brand/${brand}-icon-96.webp`), img('dark', `/brand/${brand}-icon-dark-96.webp`))
}

function BrandIcons ({ size = 30, className = '' }) {
  return h('span', { className: ('brand-icons ' + className).trim(), 'aria-hidden': 'true' },
    h(BrandIcon, { brand: 'aegis', size }),
    h(BrandIcon, { brand: 'themis', size }))
}

/**
 * kind 'mark' (shield / scales only, 320 + 640 px) or 'lockup' (mark + wordmark, 640 px).
 * `priority` marks an above-the-fold image (eager, high fetch priority); everything else is lazy.
 */
function Logo ({ brand, kind = 'mark', priority = false, className = '', plate = true, reveal = false }) {
  const lockup = kind === 'lockup'
  const make = (theme) => {
    const dark = theme === 'dark'
    const dims = (lockup ? (dark ? LOCKUP_DARK : LOCKUP) : (dark ? MARK_DARK : MARK))[brand]
    const base = `/brand/${brand}-${kind}${dark ? '-dark' : ''}`
    return h('img', {
      key: theme,
      className: `logo-img logo-${kind} theme-${theme}-only`,
      src: lockup ? `${base}-640.webp` : `${base}-320.webp`,
      srcSet: lockup ? undefined : `${base}-320.webp 320w, ${base}-640.webp 640w`,
      sizes: lockup ? undefined : '(max-width: 640px) 160px, 200px',
      alt: lockup ? `${NAMES[brand]} logo` : `${NAMES[brand]} mark`,
      width: dims.w,
      height: dims.h,
      decoding: 'async',
      loading: priority && !dark ? 'eager' : 'lazy',
      // lowercase: React 18 passes unknown lowercase attributes through (camelCase fetchPriority is React 19)
      fetchpriority: priority && !dark ? 'high' : undefined
    })
  }
  return h('span', {
    className: ('logo-plate ' + (plate ? '' : 'logo-bare ') + className).trim(),
    'data-reveal': reveal ? '' : undefined
  }, make('light'), make('dark'))
}

module.exports = { BrandIcon, BrandIcons, Logo }
module.exports.default = module.exports
