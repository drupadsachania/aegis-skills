'use strict'

// Several web tests (skill pages, sitemap, downloads) read apps/web/public/downloads, and the release-assets
// tests regenerate it when it looks stale. Running those in parallel workers raced: a page test could read the
// folder while another worker was rewriting it, and on a clean checkout (CI) the folder did not exist at all.
// Generate it once, up front, before any test file starts, so every test sees a complete and fresh copy.
const path = require('path')
const { execFileSync } = require('child_process')

module.exports = async function globalSetup () {
  execFileSync(process.execPath, [path.join(__dirname, 'scripts', 'build-downloads.js')], {
    cwd: path.join(__dirname, '..', '..'),
    stdio: 'pipe'
  })
}
