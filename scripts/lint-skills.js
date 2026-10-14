#!/usr/bin/env node
'use strict'

/**
 * Aegis skill lint: Agent Skills frontmatter, skill.json sidecar, links,
 * token budgets and the scope-and-authorization section.
 * Usage: node scripts/lint-skills.js [skillsDir]     (exit 1 on any error)
 */

const fs = require('fs')
const path = require('path')
const meta = require('aegis-skills/lib/skill-meta')
const { familyOf } = require('aegis-skills/mcp/skill-families')

const BUDGETS = { bodyTokens: 5000, bodyLines: 500, phaseTokens: 4000, totalPhaseTokens: 16000 }
const ALLOWED_KEYS = new Set(['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools'])
const ALLOWED_ENTRIES = new Set(['SKILL.md', 'skill.json', 'intel-state.json', 'references'])
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const SEMVER = /^\d+\.\d+\.\d+$/
const AUTH_LINE = '- Use only on systems you own or are explicitly authorized to assess.'
// Every skill states, in the same words, that the assistant itself never calls a network or API (owner decision 2026-10-14).
const NETWORK_LINE = '- No network or API calls by the assistant: it never makes network requests, calls APIs or contacts outside services. Commands here are for a human operator to review and run. Redact secrets, credentials, personal data and samples before sharing anything.'
// Text that would make, or invite the assistant to make, a network or API call, or to send data out. Checked in SKILL.md
// and every reference file. Commands for the operator's own systems (aws, az, nmap...) are allowed; HTTP clients, API
// endpoints, API-key headers and uploads to outside services are not.
const NETWORK_PATTERNS = [
  [/\b(curl|wget|Invoke-WebRequest|Invoke-RestMethod|DownloadString|DownloadFile)\b/i, 'an HTTP client command'],
  [/\b(requests\.(get|post|put|delete)|urllib\.request|http\.client|axios\.|fetch\()/, 'an HTTP client call in code'],
  [/https?:\/\/[^\s)`'"<>]*\/(api|rest)\//i, 'an API endpoint URL'],
  [/(x-apikey|api[_-]?key\s*[:=]|Authorization:\s*Bearer)/i, 'an API key or token placeholder'],
  [/<[A-Z_]*(API_KEY|TOKEN)[A-Z_]*>/, 'an API key or token placeholder'],
  [/\b(upload|submit)\b[^.\n]{0,40}\b(to|on)\b[^.\n]{0,20}\b(VirusTotal|MalwareBazaar|Hybrid Analysis|ANY\.RUN|urlscan|Joe Sandbox|public sandbox)/i, 'an instruction to upload data to an outside service']
]

/**
 * The one implementation of the scope rule: returns the problems found in the
 * "## Scope and authorization" section of a SKILL.md body (purpose line, the exact
 * authorization line, out-of-scope line). An empty array means the block is complete.
 */
function checkScopeBlock (body) {
  const lines = body.split('\n')
  const i = lines.findIndex(l => l.trim() === '## Scope and authorization')
  if (i === -1) return ['missing "## Scope and authorization" section']
  const sec = []
  for (let j = i + 1; j < lines.length && !/^#{1,2} /.test(lines[j]); j++) sec.push(lines[j].trim())
  const problems = []
  if (!sec.some(l => /^- Purpose: \S/.test(l))) problems.push('scope section needs "- Purpose: ..."')
  if (!sec.includes(AUTH_LINE)) problems.push(`scope section needs "${AUTH_LINE}"`)
  if (!sec.some(l => /^- Out of scope: \S/.test(l))) problems.push('scope section needs "- Out of scope: ..."')
  if (!sec.includes(NETWORK_LINE)) problems.push('scope section needs the no-network line (NETWORK_LINE in scripts/lint-skills.js)')
  return problems
}

/** Problems for any line of `text` that matches a NETWORK_PATTERNS rule. `file` labels the message. */
function checkNoNetwork (text, file) {
  const problems = []
  text.split('\n').forEach((line, i) => {
    for (const [re, what] of NETWORK_PATTERNS) if (re.test(line)) problems.push(`${file}:${i + 1}: ${what} (skills must not make or invite network/API calls)`)
  })
  return problems
}

function lintSkill (dir) {
  const errors = []
  const err = m => errors.push(m)
  const name = path.basename(dir)

  for (const e of fs.readdirSync(dir)) if (!ALLOWED_ENTRIES.has(e)) err(`unexpected entry "${e}" in skill folder`)
  const mdPath = path.join(dir, 'SKILL.md')
  if (!fs.existsSync(mdPath)) return ['missing SKILL.md']
  let fm, body
  try { ({ data: fm, body } = meta.parseSkillMd(fs.readFileSync(mdPath, 'utf8'))) } catch (e) { return [`frontmatter does not parse: ${e.message}`] }

  for (const k of Object.keys(fm)) if (!ALLOWED_KEYS.has(k)) err(`forbidden frontmatter key "${k}" (move it to skill.json or delete it)`)
  if (typeof fm.name !== 'string' || !NAME_RE.test(fm.name) || fm.name.length > 64) err(`name "${fm.name}" must be 1-64 chars of a-z, 0-9 and single hyphens`)
  if (fm.name !== name) err(`name "${fm.name}" must equal folder name "${name}"`)
  const desc = typeof fm.description === 'string' ? fm.description.trim() : ''
  if (!desc) err('description is required')
  else if (desc.length > 1024) err(`description is ${desc.length} chars (max 1024)`)
  if (fm.license !== meta.LICENSE) err(`license must be "${meta.LICENSE}"`)
  const md = fm.metadata && typeof fm.metadata === 'object' && !Array.isArray(fm.metadata) ? fm.metadata : null
  if (!md) err('metadata map is required')
  else {
    for (const [k, v] of Object.entries(md)) if (typeof v !== 'string') err(`metadata.${k} must be a string (quote it)`)
    if (!SEMVER.test(String(md.version))) err('metadata.version must be x.y.z')
    if (md.osk !== meta.OSK) err(`metadata.osk must be "${meta.OSK}"`)
    if (md.family !== familyOf(name)) err(`metadata.family must be "${familyOf(name)}" (see skill-families.js)`)
  }

  let sj
  try { sj = meta.readSkillJson(dir) } catch (e) { err(`skill.json missing or invalid: ${e.message}`); return [...new Set(errors)] }
  if (sj.osk !== meta.OSK) err(`skill.json osk must be "${meta.OSK}"`)
  if (sj.name !== name) err('skill.json name must equal the folder name')
  if (md && sj.version !== md.version) err('skill.json version must equal metadata.version')
  if (md && sj.family !== md.family) err('skill.json family must equal metadata.family')
  if (meta.normalizeDescription(sj.description) !== meta.normalizeDescription(fm.description)) err('skill.json description must equal the SKILL.md description')
  for (const k of ['endpoints', 'platforms', 'tools']) if (k in sj) err(`skill.json must not contain "${k}"`)

  const phases = Array.isArray(sj.phases) ? sj.phases : []
  if (!phases.length) err('skill.json has no phases')
  const seen = new Set()
  let total = 0
  for (const p of phases) {
    if (!p || typeof p.id !== 'string' || !NAME_RE.test(p.id)) { err(`bad phase id ${JSON.stringify(p && p.id)}`); continue }
    if (seen.has(p.id)) err(`duplicate phase id ${p.id}`)
    seen.add(p.id)
    if (typeof p.file !== 'string' || !meta.PHASE_FILE.test(p.file)) { err(`phase ${p.id}: file must match references/<name>.md`); continue }
    const fp = path.join(dir, p.file)
    if (!fs.existsSync(fp)) { err(`phase ${p.id}: ${p.file} does not exist`); continue }
    const t = meta.estimateTokens(fs.readFileSync(fp, 'utf8'))
    total += t
    if (t > BUDGETS.phaseTokens) err(`phase ${p.id}: ${t} tokens (max ${BUDGETS.phaseTokens})`)
    if (p.tokens !== t) err(`phase ${p.id}: skill.json tokens ${p.tokens} != actual ${t} (run npm run skills:tokens)`)
    if (!body.includes(`](${p.file})`)) err(`phase ${p.id}: SKILL.md body must link [...](${p.file})`)
  }
  if (total > BUDGETS.totalPhaseTokens) err(`phases total ${total} tokens (max ${BUDGETS.totalPhaseTokens})`)
  const bodyTokens = meta.estimateTokens(body)
  if (bodyTokens > BUDGETS.bodyTokens) err(`SKILL.md body is ${bodyTokens} tokens (max ${BUDGETS.bodyTokens})`)
  const bodyLines = body.split('\n').length
  if (bodyLines > BUDGETS.bodyLines) err(`SKILL.md body is ${bodyLines} lines (max ${BUDGETS.bodyLines})`)

  for (const m of body.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = m[1].split('#')[0]
    if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue
    if (target.includes('..') || path.isAbsolute(target)) { err(`link ${target} must stay inside the skill folder`); continue }
    if (!fs.existsSync(path.join(dir, target))) err(`linked file ${target} does not exist`)
  }
  for (const m of body.matchAll(/references\/[A-Za-z0-9._-]+\.md/g)) {
    if (!fs.existsSync(path.join(dir, m[0]))) err(`linked file ${m[0]} does not exist`)
  }

  for (const p of checkScopeBlock(body)) err(p)
  for (const p of checkNoNetwork(body, 'SKILL.md')) err(p)
  const refDir = path.join(dir, 'references')
  if (fs.existsSync(refDir)) {
    for (const f of fs.readdirSync(refDir).filter(f => f.endsWith('.md'))) {
      for (const p of checkNoNetwork(fs.readFileSync(path.join(refDir, f), 'utf8'), `references/${f}`)) err(p)
    }
  }
  return [...new Set(errors)]
}

function lintAll (skillsDir) {
  const out = {}
  for (const e of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (e.isDirectory()) out[e.name] = lintSkill(path.join(skillsDir, e.name))
  }
  return out
}

function main () {
  const skillsDir = path.resolve(process.argv[2] || path.join(__dirname, '..', 'packages', 'aegis', 'skills'))
  const results = lintAll(skillsDir)
  let count = 0
  for (const [name, errors] of Object.entries(results)) {
    for (const e of errors) { console.error(`✗ ${name}: ${e}`); count++ }
  }
  console.log(`Linted ${Object.keys(results).length} skills: ${count} error(s)`)
  if (count > 0) process.exit(1)
}

if (require.main === module) main()

module.exports = { lintSkill, lintAll, checkScopeBlock, checkNoNetwork, BUDGETS, AUTH_LINE, NETWORK_LINE }
