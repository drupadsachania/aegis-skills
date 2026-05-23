'use strict'

const React = require('react')
require('../styles/globals.css')

function App({ Component, pageProps }) {
  return React.createElement(Component, pageProps)
}

module.exports = App
module.exports.default = App
