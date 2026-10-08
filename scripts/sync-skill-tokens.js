#!/usr/bin/env node
'use strict'

// Recompute phase token counts in every skill.json from the phase files.
// Usage: node scripts/sync-skill-tokens.js [skillsDir]
const fs = require('fs')
const path = require('path')
const meta = require('aegis-skills/lib/skill-meta')

const skillsDir = path.resolve(process.argv[2] || path.join(__dirname, '..', 'packages', 'aegis', 'skills'))
let changed = 0
for (const name of fs.readdirSync(skillsDir).sort()) {
  const dir = path.join(skillsDir, name)
  if (!fs.existsSync(path.join(dir, 'skill.json'))) continue
  if (meta.syncTokens(dir)) { console.log(`✓ ${name}`); changed++ }
}
console.log(`Updated token counts in ${changed} skill(s)`)
