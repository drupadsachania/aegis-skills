'use strict'

const React = require('react')
require('../styles/tokens.generated.css') // shared Kairos tokens, copied by scripts/sync-design-tokens.js
require('../styles/globals.css')

function App({ Component, pageProps }) {
  return React.createElement(Component, pageProps)
}

module.exports = App
module.exports.default = App
