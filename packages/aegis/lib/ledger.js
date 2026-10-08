'use strict'

/**
 * Install ledger: ~/.aegis/installed.json (override with AEGIS_HOME).
 * One entry per platform + scope + skills folder, with the sha256 of every
 * file Aegis wrote, so refresh can spot user edits and uninstall removes only
 * Aegis files.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')

const aegisHome = () => process.env.AEGIS_HOME || path.join(os.homedir(), '.aegis')
const ledgerFile = () => path.join(aegisHome(), 'installed.json')
const same = (a, b) => path.resolve(a) === path.resolve(b)

function load () {
  try {
    const v = JSON.parse(fs.readFileSync(ledgerFile(), 'utf8'))
    if (v && Array.isArray(v.installs)) return v
  } catch { /* no ledger yet */ }
  return { installs: [] }
}

function save (l) {
  fs.mkdirSync(aegisHome(), { recursive: true })
  fs.writeFileSync(ledgerFile(), JSON.stringify(l, null, 2) + '\n', 'utf8')
}

function find (l, t) {
  return l.installs.find(e => e.platform === t.platform && e.scope === t.scope && same(e.skillsDir, t.skillsDir)) || null
}

function upsert (l, entry) {
  const old = find(l, entry)
  if (old) l.installs.splice(l.installs.indexOf(old), 1)
  l.installs.push(entry)
  return l
}

// Several platforms can share one folder (e.g. .agents/skills): ownership is the union.
function filesFor (l, skillsDir) {
  return Object.assign({}, ...l.installs.filter(e => same(e.skillsDir, skillsDir)).map(e => e.files || {}))
}

module.exports = { aegisHome, ledgerFile, load, save, find, upsert, filesFor }
