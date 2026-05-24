'use strict'

const React = require('react')

function Layout({ children }) {
  return React.createElement(
    'div',
    { className: 'page-root' },
    // ── Fixed nav ──
    React.createElement(
      'nav',
      { className: 'nav-root' },
      React.createElement(
        'a',
        { href: '/', className: 'nav-brand' },
        React.createElement('span', { className: 'nav-glyph' }),
        'THEMIS · AEGIS'
      ),
      React.createElement(
        'ul',
        { className: 'nav-links' },
        React.createElement(
          'li',
          null,
          React.createElement('a', { href: '/' }, 'Skills')
        ),
        React.createElement(
          'li',
          null,
          React.createElement('a', { href: '/themis' }, 'Themis')
        ),
        React.createElement(
          'li',
          null,
          React.createElement('a', { href: '/docs' }, 'Docs')
        ),
        React.createElement(
          'li',
          null,
          React.createElement(
            'a',
            {
              href: 'https://github.com/drupadsachania/deception-skills',
              target: '_blank',
              rel: 'noopener noreferrer'
            },
            'GitHub ↗'
          )
        )
      )
    ),
    // ── Page content ──
    React.createElement('main', { style: { position: 'relative', zIndex: 1 } }, children),
    // ── Footer ──
    React.createElement(
      'footer',
      { className: 'footer-root' },
      React.createElement(
        'div',
        { className: 'footer-inner' },
        React.createElement('span', { className: 'footer-brand' }, 'Aegis'),
        React.createElement(
          'div',
          { className: 'footer-right' },
          React.createElement(
            'a',
            {
              href: 'https://kairo-foundation.org',
              target: '_blank',
              rel: 'noopener noreferrer'
            },
            'Kairo Foundation'
          ),
          React.createElement('span', { className: 'footer-sep' }, '·'),
          React.createElement(
            'a',
            {
              href: 'https://github.com/drupadsachania/deception-skills',
              target: '_blank',
              rel: 'noopener noreferrer'
            },
            'GitHub'
          ),
          React.createElement('span', { className: 'footer-copy' }, 'v0.1.0 · MIT')
        )
      )
    )
  )
}

module.exports = Layout
module.exports.default = Layout
