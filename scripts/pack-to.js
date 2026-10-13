#!/usr/bin/env node
'use strict'
// Packs one workspace package into <destDir> (its prepack script runs) and prints the tarball path with '/' separators.
// Usage: node scripts/pack-to.js <aegis|themis-core|themis-gateway|themis-plugin|themis|npm-name> <destDir>
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const lib = require('./lib/release-manifests')

const pkg = lib.findPackage(process.argv[2] || '')
const dest = process.argv[3]
if (!pkg || !dest) { console.error('usage: node scripts/pack-to.js <package> <destDir>'); process.exit(2) }
const abs = path.resolve(dest)
fs.mkdirSync(abs, { recursive: true })
const out = execSync(`npm pack --json --workspace "${pkg.dir}" --pack-destination "${abs}"`,
  { cwd: lib.ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 64 * 1024 * 1024 })
const start = out.search(/^\[\s*\{/m)
if (start === -1) { console.error(`pack-to: npm pack printed no JSON for ${pkg.dir}`); process.exit(1) }
const file = path.join(abs, JSON.parse(out.slice(start))[0].filename)
if (!fs.existsSync(file)) { console.error(`pack-to: ${file} was not written`); process.exit(1) }
console.log(file.split(path.sep).join('/'))
