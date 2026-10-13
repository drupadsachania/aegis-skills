#!/usr/bin/env node
'use strict'
// Blocks until every internal dependency range (aegis-skills, @aegis-skills/*) of a package.json resolves on npm.
// Enforces publish order: themis-core -> themis-gateway. Uses only the npm CLI; installs nothing.
// Usage: node scripts/wait-for-deps.js <package.json> [--timeout-min 20] [--interval-sec 30]
// Test hook: WAIT_FOR_DEPS_VIEW replaces the command prefix `npm view` (it is run as `<prefix> "<spec>" version --json`).
const fs = require('fs')
const { execSync } = require('child_process')

const NAME_RE = /^[a-z0-9@/._-]+$/
const RANGE_RE = /^\^\d+\.\d+\.\d+$/

// ['name@^X.Y.Z', ...] for the internal dependencies of a parsed package.json. Throws on anything unexpected, because
// the specs are later interpolated into a shell command.
function internalSpecs (pj) {
  const wanted = []
  for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const [name, range] of Object.entries(pj[field] || {})) {
      if (name !== 'aegis-skills' && !name.startsWith('@aegis-skills/')) continue
      if (!NAME_RE.test(name) || !RANGE_RE.test(range)) throw new Error(`refusing unexpected spec ${name}@${range}`)
      wanted.push(`${name}@${range}`)
    }
  }
  return wanted
}

function resolves (spec) {
  const view = process.env.WAIT_FOR_DEPS_VIEW || 'npm view'
  try { return execSync(`${view} "${spec}" version --json`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().length > 0 } catch { return false }
}

function waitFor (wanted, { timeoutMin, intervalSec, log = console.log }) {
  const sleep = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
  const deadline = Date.now() + timeoutMin * 60000
  let pending = [...wanted]
  for (;;) {
    pending = pending.filter(s => !resolves(s))
    if (!pending.length) return []
    if (Date.now() > deadline) return pending
    log(`wait-for-deps: waiting for ${pending.join(', ')}`)
    sleep(intervalSec * 1000)
  }
}

if (require.main === module) {
  const argv = process.argv
  const num = (flag, dflt) => { const i = argv.indexOf(flag); return i === -1 ? dflt : Number(argv[i + 1]) }
  const file = argv[2]
  const timeoutMin = num('--timeout-min', 20)
  const intervalSec = num('--interval-sec', 30)
  if (!file || file.startsWith('--') || !(timeoutMin > 0) || !(intervalSec > 0)) { console.error('usage: node scripts/wait-for-deps.js <package.json> [--timeout-min N] [--interval-sec N]'); process.exit(2) }
  let wanted
  try { wanted = internalSpecs(JSON.parse(fs.readFileSync(file, 'utf8'))) } catch (e) { console.error(`wait-for-deps: ${e.message}`); process.exit(1) }
  const pending = waitFor(wanted, { timeoutMin, intervalSec })
  if (pending.length) { console.error(`wait-for-deps: unresolved after ${timeoutMin} min: ${pending.join(', ')}. Publish those packages first.`); process.exit(1) }
  console.log(wanted.length ? `wait-for-deps: OK (${wanted.join(', ')})` : 'wait-for-deps: no internal dependencies')
}

module.exports = { internalSpecs, waitFor }
