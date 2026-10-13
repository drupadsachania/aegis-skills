#!/usr/bin/env node
'use strict'

// node:sqlite prints an ExperimentalWarning on first load (Node 22/24). It is
// expected and harmless for Themis, so drop exactly that warning. This must run
// before anything requires node:sqlite.
const originalEmitWarning = process.emitWarning
process.emitWarning = function themisEmitWarning (warning, ...args) {
  const message = typeof warning === 'string' ? warning : warning && warning.message
  const type = typeof args[0] === 'string' ? args[0] : args[0] && args[0].type
  const isExperimental = type === 'ExperimentalWarning' || (warning && warning.name === 'ExperimentalWarning')
  if (isExperimental && /SQLite/.test(String(message))) return
  return originalEmitWarning.call(process, warning, ...args)
}

const major = Number(process.versions.node.split('.')[0])
if (major < 24) {
  console.error(`themis requires Node.js 24 or newer (found ${process.versions.node}).`)
  process.exit(1)
}

require('../dist/cli/index.js')
  .main(process.argv.slice(2))
  .then((code) => { process.exitCode = code })
  .catch((err) => {
    console.error(err && err.message ? err.message : String(err))
    process.exitCode = 1
  })
