'use strict'

const React = require('react')

function Layout({ children }) {
  return React.createElement(
    'div',
    { className: 'min-h-screen bg-zinc-950 text-zinc-100 font-[system-ui,sans-serif]' },
    React.createElement(
      'nav',
      { className: 'border-b border-zinc-800 px-6 py-4' },
      React.createElement(
        'div',
        { className: 'max-w-[1100px] mx-auto flex items-center justify-between' },
        React.createElement(
          'a',
          { href: '/', className: 'text-zinc-100 font-semibold text-lg tracking-tight hover:text-indigo-400 transition-colors' },
          'OpenSkill'
        ),
        React.createElement(
          'a',
          {
            href: 'https://github.com/drupadsachania/deception-skills',
            target: '_blank',
            rel: 'noopener noreferrer',
            className: 'text-zinc-400 hover:text-zinc-100 text-sm transition-colors'
          },
          'GitHub ↗'
        )
      )
    ),
    React.createElement('main', { className: 'max-w-[1100px] mx-auto px-6' }, children),
    React.createElement(
      'footer',
      { className: 'border-t border-zinc-800 mt-20 px-6 py-8' },
      React.createElement(
        'div',
        { className: 'max-w-[1100px] mx-auto flex items-center justify-between text-zinc-500 text-sm' },
        React.createElement(
          'a',
          {
            href: 'https://github.com/drupadsachania/deception-skills',
            target: '_blank',
            rel: 'noopener noreferrer',
            className: 'hover:text-zinc-300 transition-colors'
          },
          'GitHub'
        ),
        React.createElement('span', null, 'OpenSkill v0.1.0 · MIT License')
      )
    )
  )
}

module.exports = Layout
module.exports.default = Layout
