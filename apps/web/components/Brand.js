'use strict'

/**
 * Logo components (see docs/design/LOGOS.md for the asset inventory and usage rules).
 *  - BrandIcon / BrandIcons: the small simplified SVG icons, for <= 64 px (nav, footer, eyebrows).
 *    Decorative by default (alt=""): the product name is always written next to them.
 *  - Logo: the large raster artwork (WebP). In the dark theme CSS puts it on a cream plate.
 * Every <img> carries explicit width/height so nothing shifts while it loads.
 */
const React = require('react')

const h = React.createElement

const NAMES = { aegis: 'Aegis', themis: 'Themis' }

// intrinsic pixel sizes of the shipped WebP files
const MARK = { aegis: { w: 320, h: 278 }, themis: { w: 320, h: 280 } }
const LOCKUP = { aegis: { w: 640, h: 652 }, themis: { w: 640, h: 657 } }

function BrandIcon ({ brand, size = 26, className = '' }) {
  return h('img', {
    className: ('brand-icon ' + className).trim(),
    src: `/brand/${brand}-icon.svg`,
    alt: '',
    width: size,
    height: size,
    decoding: 'async'
  })
}

function BrandIcons ({ size = 26, className = '' }) {
  return h('span', { className: ('brand-icons ' + className).trim(), 'aria-hidden': 'true' },
    h(BrandIcon, { brand: 'aegis', size }),
    h(BrandIcon, { brand: 'themis', size }))
}

/**
 * kind 'mark' (shield / scales only, 320 + 640 px) or 'lockup' (mark + wordmark, 640 px).
 * `priority` marks an above-the-fold image (eager, high fetch priority); everything else is lazy.
 */
function Logo ({ brand, kind = 'mark', priority = false, className = '', plate = true, reveal = false }) {
  const dims = (kind === 'lockup' ? LOCKUP : MARK)[brand]
  const base = `/brand/${brand}-${kind}`
  const img = h('img', {
    className: `logo-img logo-${kind}`,
    src: kind === 'lockup' ? `${base}-640.webp` : `${base}-320.webp`,
    srcSet: kind === 'lockup' ? undefined : `${base}-320.webp 320w, ${base}-640.webp 640w`,
    sizes: kind === 'lockup' ? undefined : '(max-width: 640px) 160px, 200px',
    alt: kind === 'lockup' ? `${NAMES[brand]} logo` : `${NAMES[brand]} mark`,
    width: dims.w,
    height: dims.h,
    decoding: 'async',
    loading: priority ? 'eager' : 'lazy',
    // lowercase: React 18 passes unknown lowercase attributes through (camelCase fetchPriority is React 19)
    fetchpriority: priority ? 'high' : undefined
  })
  return h('span', {
    className: ('logo-plate ' + (plate ? '' : 'logo-bare ') + className).trim(),
    'data-reveal': reveal ? '' : undefined
  }, img)
}

module.exports = { BrandIcon, BrandIcons, Logo }
module.exports.default = module.exports
