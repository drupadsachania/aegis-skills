#!/usr/bin/env node
'use strict'

/**
 * One-shot migration of Aegis skills from osk 1.0 to osk 1.1.
 *
 *   osk 1.0: structured YAML frontmatter + compiled skill.json + artifacts/
 *   osk 1.1: Agent Skills frontmatter (name, description, license, metadata)
 *            + skill.json sidecar (phases with file, frameworks, tags, ...)
 *
 * Usage: node scripts/migrate-skill-frontmatter.js [--dry-run] [--skills-dir DIR] [--scope-file FILE]
 * Writes nothing unless every skill migrates cleanly. Safe to re-run.
 */

const fs = require('fs')
const path = require('path')
const meta = require('aegis-skills/lib/skill-meta')
const { familyOf } = require('aegis-skills/mcp/skill-families')

const ROOT = path.join(__dirname, '..')
const { AUTH_LINE, NETWORK_LINE } = require('./lint-skills')

function parseArgs (argv) {
  const a = {
    dryRun: false,
    skillsDir: path.join(ROOT, 'packages', 'aegis', 'skills'),
    scopeFile: path.join(__dirname, 'data', 'scope-and-authorization.json')
  }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') a.dryRun = true
    else if (argv[i] === '--skills-dir') a.skillsDir = path.resolve(argv[++i])
    else if (argv[i] === '--scope-file') a.scopeFile = path.resolve(argv[++i])
    else throw new Error(`unknown argument: ${argv[i]}`)
  }
  return a
}

function bumpMinor (v) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(v))
  if (!m) throw new Error(`version is not x.y.z: ${v}`)
  return `${m[1]}.${Number(m[2]) + 1}.0`
}

function foldDescription (desc) {
  const lines = []
  let line = ''
  for (const w of desc.split(' ')) {
    if (line && (line + ' ' + w).length > 76) { lines.push(line); line = w } else line = line ? line + ' ' + w : w
  }
  if (line) lines.push(line)
  return lines.map(l => '  ' + l).join('\n')
}

function renderFrontmatter ({ name, description, version, family }) {
  return [
    '---',
    `name: ${name}`,
    'description: >-',
    foldDescription(description),
    `license: ${meta.LICENSE}`,
    'metadata:',
    `  version: "${version}"`,
    `  osk: "${meta.OSK}"`,
    `  family: "${family}"`,
    '---',
    ''
  ].join('\n')
}

function insertScope (body, entry) {
  if (/^## Scope and authorization\s*$/m.test(body)) return body
  const section = ['## Scope and authorization', '', `- Purpose: ${entry.purpose}`, AUTH_LINE, `- Out of scope: ${entry.outOfScope}`, NETWORK_LINE, ''].join('\n')
  const lines = body.split('\n')
  const h1 = lines.findIndex(l => /^# /.test(l))
  if (h1 === -1) return section + '\n' + body
  const rest = lines.slice(h1 + 1).join('\n').replace(/^\n+/, '')
  return [...lines.slice(0, h1 + 1), '', section, rest].join('\n')
}

function migrateSkill (dir, scopeMap) {
  const name = path.basename(dir)
  const { data, body } = meta.parseSkillMd(fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8'))
  if (data.metadata && data.metadata.osk === meta.OSK && !data.phases) return { name, changed: false }
  if (data.name !== name) throw new Error(`${name}: frontmatter name "${data.name}" does not match the folder`)
  if (!Array.isArray(data.phases) || data.phases.length === 0) throw new Error(`${name}: no phases in frontmatter`)
  const scope = scopeMap[name]
  if (!scope || !scope.purpose || !scope.outOfScope) throw new Error(`${name}: no entry in scope file`)

  let old = {}
  try { old = meta.readSkillJson(dir) } catch { /* no compiled manifest */ }

  const phases = data.phases.map(p => {
    if (typeof p.ref !== 'string' || !meta.PHASE_FILE.test(p.ref)) throw new Error(`${name}: bad phase ref ${p.ref}`)
    const out = { id: p.id, file: p.ref, tokens: meta.estimateTokens(fs.readFileSync(path.join(dir, p.ref), 'utf8')) }
    if (p.auto) out.auto = true
    return out
  })

  const skillJson = {
    osk: meta.OSK,
    name,
    version: bumpMinor(data.version),
    description: meta.normalizeDescription(data.description),
    family: familyOf(name),
    frameworks: data.frameworks || old.frameworks || [],
    tags: data.tags || old.tags || [],
    phases,
    research: old.research || data['research-agent'] || {}
  }
  const selfLearning = old['self-learning'] || data['self-learning']
  if (selfLearning) skillJson['self-learning'] = selfLearning
  const context = old.context || data.context
  if (context) skillJson.context = context

  const newBody = meta.appendPhaseLinks(insertScope(body.replace(/^\s+/, ''), scope), phases)
  const skillMd = renderFrontmatter(skillJson) + '\n' + newBody.trimEnd() + '\n'
  return { name, changed: true, skillMd, skillJson }
}

function main () {
  const args = parseArgs(process.argv.slice(2))
  const scopeMap = JSON.parse(fs.readFileSync(args.scopeFile, 'utf8'))
  const dirs = fs.readdirSync(args.skillsDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && fs.existsSync(path.join(args.skillsDir, e.name, 'SKILL.md')))
    .map(e => path.join(args.skillsDir, e.name))
    .sort()
  const results = dirs.map(dir => ({ dir, ...migrateSkill(dir, scopeMap) })) // throws before any write
  let changed = 0
  for (const r of results) {
    if (!r.changed) { console.log(`= ${r.name} (already osk ${meta.OSK})`); continue }
    changed++
    console.log(`${args.dryRun ? '~' : '✓'} ${r.name} → v${r.skillJson.version}, ${r.skillJson.phases.length} phases, family ${r.skillJson.family}`)
    if (!args.dryRun) {
      fs.writeFileSync(path.join(r.dir, 'SKILL.md'), r.skillMd, 'utf8')
      meta.writeSkillJson(r.dir, r.skillJson)
    }
  }
  console.log(`\n${args.dryRun ? 'Would migrate' : 'Migrated'} ${changed}/${dirs.length} skills`)
}

if (require.main === module) {
  try { main() } catch (e) { console.error(`✗ ${e.message}`); process.exit(1) }
}

module.exports = { migrateSkill, bumpMinor, renderFrontmatter, insertScope, foldDescription }
