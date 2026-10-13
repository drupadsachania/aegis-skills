#!/usr/bin/env node
'use strict'
// Builds the Themis workspace packages that apps/web depends on, in dependency
// order, so `next build` / `next dev` always see fresh dist/ files and typings.
const fs = require('node:fs')
const path = require('node:path')
const { execSync } = require('node:child_process')

const root = path.resolve(__dirname, '..')
const PACKAGES = [
  ['@aegis-skills/themis-core', 'packages/themis-core'],
  ['@aegis-skills/themis-gateway', 'packages/themis-gateway'],
]

for (const [name, dir] of PACKAGES) {
  if (!fs.existsSync(path.join(root, dir, 'package.json'))) continue
  execSync(`npm run build -w ${name}`, { cwd: root, stdio: 'inherit' })
}
