#!/usr/bin/env node
'use strict'
// Fails if an installed dependency tree contains native addons (*.node) or node-gyp projects (binding.gyp).
// Usage: node scripts/assert-no-native.js <node_modules dir>
const fs = require('fs')
const path = require('path')

const root = path.resolve(process.argv[2] || 'node_modules')
if (!fs.existsSync(root)) { console.error(`assert-no-native: ${root} does not exist`); process.exit(2) }

const hits = []
let scanned = 0
const stack = [root]
while (stack.length) {
  const dir = stack.pop()
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isSymbolicLink()) continue
    if (e.isDirectory()) { stack.push(p); continue }
    scanned++
    if (e.name.endsWith('.node') || e.name === 'binding.gyp') hits.push(path.relative(root, p))
  }
}
if (hits.length) {
  console.error(`assert-no-native: ${hits.length} native artefact(s) found:`)
  hits.slice(0, 50).forEach(h => console.error(`  - ${h}`))
  process.exit(1)
}
console.log(`assert-no-native: OK (${scanned} files scanned, no *.node or binding.gyp)`)
