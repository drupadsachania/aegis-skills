#!/usr/bin/env node
'use strict'
// Tells CI which parts of the restructure exist, so jobs switch on as the parts land.
// Prints key=value lines and appends them to $GITHUB_OUTPUT when set.
const fs = require('fs')

const has = f => fs.existsSync(f)
const nameOf = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')).name } catch { return null } }
const scripts = JSON.parse(fs.readFileSync('package.json', 'utf8')).scripts || {}
const packTool = has('scripts/assert-pack.js') && has('scripts/pack-to.js')

const PKGS = [
  ['aegis', 'packages/aegis', 'aegis-skills'],
  ['themis-core', 'packages/themis-core', '@aegis-skills/themis-core'],
  ['themis-gateway', 'packages/themis-gateway', '@aegis-skills/themis-gateway'],
  ['themis-plugin', 'packages/themis-plugin', '@aegis-skills/themis-plugin'],
  ['themis', 'packages/themis-app', '@aegis-skills/themis']
]
const present = PKGS.filter(([, dir, name]) => nameOf(`${dir}/package.json`) === name).map(([key]) => key)

const out = {
  lint_skills: Boolean(scripts['lint:skills']),
  check_deps: Boolean(scripts['check:deps']),
  check_layout: Boolean(scripts['check:layout']),
  release_scripts: has('scripts/check-versions.js') && Boolean(scripts['check:versions']) && Boolean(scripts['test:scripts']),
  aegis: packTool && present.includes('aegis'),
  themis_app: packTool && ['themis-core', 'themis-gateway', 'themis'].every(k => present.includes(k)),
  web: has('apps/web/package.json'),
  packs: JSON.stringify(packTool ? present : [])
}
const lines = Object.entries(out).map(([k, v]) => `${k}=${v}`)
console.log(lines.join('\n'))
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, lines.join('\n') + '\n')
