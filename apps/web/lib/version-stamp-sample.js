'use strict'

// A true sample of the stamp Themis puts on its reports: { themis, aegis, osk }.
// It reads the same inputs as versionStamp() in packages/themis-core/src/version.ts (the core
// package version, the installed aegis-skills version, and the osk of the first skill.json in
// sorted order), so the page cannot drift from the code. A test compares it with versionStamp()
// itself whenever the core package is built.
const fs = require('fs')
const path = require('path')
const { REPO_ROOT, AEGIS_DIR, SKILLS_DIR } = require('./site-paths')

const readJson = file => { try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return null } }

function oskOf (skillsDir) {
  let entries = []
  try { entries = fs.readdirSync(skillsDir).sort() } catch { return 'unknown' }
  for (const name of entries) {
    const osk = (readJson(path.join(skillsDir, name, 'skill.json')) || {}).osk
    if (typeof osk === 'string') return osk
    if (typeof osk === 'number') return String(osk)
  }
  return 'unknown'
}

function sampleStamp () {
  const core = readJson(path.join(REPO_ROOT, 'packages', 'themis-core', 'package.json'))
  const aegis = readJson(path.join(AEGIS_DIR, 'package.json'))
  return {
    themis: core && typeof core.version === 'string' ? core.version : 'unknown',
    aegis: aegis && typeof aegis.version === 'string' ? aegis.version : 'unknown',
    osk: oskOf(SKILLS_DIR)
  }
}

// The one-line form used in the standalone app's report footer (stampLine in themis-app/src/store/reports.ts).
const stampLine = v => `Themis ${v.themis} · Aegis ${v.aegis} (osk ${v.osk})`

module.exports = { sampleStamp, stampLine, oskOf }
