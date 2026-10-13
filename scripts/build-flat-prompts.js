#!/usr/bin/env node
'use strict'

/**
 * Single-file prompts: SKILL.md body + every phase inlined, stamped with the
 * intel date. Generated at build time, never committed.
 * Usage: node scripts/build-flat-prompts.js [--out DIR] [--skills-dir DIR]
 */

const fs = require('fs')
const path = require('path')
const meta = require('aegis-skills/lib/skill-meta')

const ROOT = path.join(__dirname, '..')

function flattenSkill (skillDir) {
  const { body } = meta.parseSkillMd(fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8'))
  const sj = meta.readSkillJson(skillDir)
  const intel = (sj['self-learning'] && sj['self-learning']['last-intel-sync']) || 'not yet synced'
  const parts = [
    `<!-- Aegis skill ${sj.name} v${sj.version} (osk ${sj.osk}). Generated file: edit the source skill, not this. -->`,
    `> Intel as of ${intel}.`,
    body.trim()
  ]
  for (const p of sj.phases || []) {
    if (!meta.PHASE_FILE.test(String(p.file))) throw new Error(`${sj.name}: bad phase file ${p.file}`)
    parts.push(`---\n\n## Phase: ${p.id}\n\n${fs.readFileSync(path.join(skillDir, p.file), 'utf8').trim()}`)
  }
  return parts.join('\n\n') + '\n'
}

function main () {
  const argv = process.argv.slice(2)
  let out = path.join(ROOT, 'dist', 'prompts')
  let skillsDir = path.join(ROOT, 'packages', 'aegis', 'skills')
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') out = path.resolve(argv[++i])
    else if (argv[i] === '--skills-dir') skillsDir = path.resolve(argv[++i])
    else throw new Error(`unknown argument: ${argv[i]}`)
  }
  fs.mkdirSync(out, { recursive: true })
  let n = 0
  for (const name of fs.readdirSync(skillsDir).sort()) {
    const dir = path.join(skillsDir, name)
    if (!fs.existsSync(path.join(dir, 'SKILL.md'))) continue
    fs.writeFileSync(path.join(out, `${name}.md`), flattenSkill(dir), 'utf8')
    n++
  }
  console.log(`Wrote ${n} flattened prompt(s) to ${out}`)
}

if (require.main === module) {
  try { main() } catch (e) { console.error(`✗ ${e.message}`); process.exit(1) }
}

module.exports = { flattenSkill }
