#!/usr/bin/env node
'use strict'

/**
 * Copies the shared design tokens (design/tokens.css, generated from design/tokens.json)
 * into the site's style folder so the Next build can import them.
 *
 *   node scripts/sync-design-tokens.js          write styles/tokens.generated.css
 *   node scripts/sync-design-tokens.js --check  exit 1 if the copy is missing or stale
 *
 * Wired into predev and prebuild (next to build-downloads.js). Vercel builds with
 * Root Directory = apps/web but still checks out the whole repository (the same
 * assumption build-downloads.js makes for packages/aegis), so the source is read at
 * build time; nothing imports ../../design at runtime. The output is git-ignored.
 */
const fs = require('fs')
const path = require('path')

const SOURCE = path.join(__dirname, '..', '..', '..', 'design', 'tokens.css')
const TARGET = path.join(__dirname, '..', 'styles', 'tokens.generated.css')
const BANNER = '/* COPIED by apps/web/scripts/sync-design-tokens.js from design/tokens.css. Do not edit; git-ignored. */\n'

function expected () {
  if (!fs.existsSync(SOURCE)) {
    throw new Error(`design tokens not found at ${SOURCE}. The site build needs the whole repository checked out (design/ is outside apps/web).`)
  }
  return BANNER + fs.readFileSync(SOURCE, 'utf8').split('\r\n').join('\n')
}

function sync () {
  fs.writeFileSync(TARGET, expected())
  return TARGET
}

function check () {
  return fs.existsSync(TARGET) && fs.readFileSync(TARGET, 'utf8') === expected()
}

if (require.main === module) {
  if (process.argv.includes('--check')) {
    if (!check()) { console.error('tokens.generated.css is missing or stale; run node scripts/sync-design-tokens.js'); process.exit(1) }
  } else {
    console.log('design tokens ->', path.relative(process.cwd(), sync()))
  }
}

module.exports = { sync, check, expected, SOURCE, TARGET }
