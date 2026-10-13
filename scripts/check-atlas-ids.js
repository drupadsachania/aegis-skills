#!/usr/bin/env node
'use strict'

/**
 * Verify every MITRE ATLAS id (AML.T…, AML.TA…) in the skill pack against the
 * official ATLAS data, and require each line that cites an id to also carry
 * its official name. Needs network unless --atlas FILE is given; not run in CI.
 * Usage: node scripts/check-atlas-ids.js [--atlas FILE] [--skills-dir DIR] [--list]
 */

const fs = require('fs')
const path = require('path')

// gray-matter's own js-yaml (no new dependency).
const yaml = require(require.resolve('js-yaml', { paths: [path.dirname(require.resolve('gray-matter'))] }))
const BASE = 'https://raw.githubusercontent.com/mitre-atlas/atlas-data/main/dist/v6/'
const ID_RE = /AML\.TA?\d{4}(?:\.\d{3})?/g

async function loadAtlasText (file) {
  if (file) return fs.readFileSync(file, 'utf8')
  let text = await (await fetch(BASE + 'ATLAS-latest.yaml')).text()
  // In the raw view ATLAS-latest.yaml is a one-line pointer such as "ATLAS-2026.09.yaml".
  if (/^ATLAS-[\w.]+\.yaml$/.test(text.trim())) text = await (await fetch(BASE + text.trim())).text()
  return text
}

function atlasNames (text) {
  const data = (yaml.safeLoad || yaml.load)(text)
  const names = {}
  const walk = o => {
    if (Array.isArray(o)) return o.forEach(walk)
    if (!o || typeof o !== 'object') return
    for (const [k, v] of Object.entries(o)) {
      if (/^AML\.TA?\d{4}(\.\d{3})?$/.test(k) && v && typeof v.name === 'string') names[k] = v.name
      if (v && typeof v === 'object' && /^AML\.TA?\d{4}(\.\d{3})?$/.test(String(v.id)) && typeof v.name === 'string') names[v.id] = v.name
      walk(v)
    }
  }
  walk(data)
  return names
}

function scan (skillsDir) {
  const hits = []
  for (const skill of fs.readdirSync(skillsDir).sort()) {
    const dir = path.join(skillsDir, skill)
    if (!fs.statSync(dir).isDirectory()) continue
    const refs = path.join(dir, 'references')
    const files = ['SKILL.md', ...(fs.existsSync(refs) ? fs.readdirSync(refs).filter(f => f.endsWith('.md')).map(f => `references/${f}`) : [])]
    for (const rel of files) {
      const p = path.join(dir, rel)
      if (!fs.existsSync(p)) continue
      fs.readFileSync(p, 'utf8').split('\n').forEach((text, i) => {
        for (const m of text.matchAll(ID_RE)) hits.push({ file: `${skill}/${rel}`, line: i + 1, id: m[0], text: text.trim() })
      })
    }
  }
  return hits
}

function check (names, hits) {
  const problems = []
  for (const h of hits) {
    if (!names[h.id]) problems.push({ kind: 'unknown', ...h })
    else if (!h.text.toLowerCase().includes(names[h.id].toLowerCase())) problems.push({ kind: 'name', official: names[h.id], ...h })
  }
  return problems
}

async function main () {
  const argv = process.argv.slice(2)
  const opt = k => { const i = argv.indexOf(k); return i === -1 ? null : argv[i + 1] }
  const names = atlasNames(await loadAtlasText(opt('--atlas')))
  if (argv.includes('--list')) { for (const [id, n] of Object.entries(names).sort()) console.log(`${id} | ${n}`); return }
  const skillsDir = path.resolve(opt('--skills-dir') || path.join(__dirname, '..', 'packages', 'aegis', 'skills'))
  const problems = check(names, scan(skillsDir))
  for (const p of problems) {
    const why = p.kind === 'unknown' ? 'unknown id' : `line lacks official name "${p.official}"`
    console.error(`✗ ${p.id}  ${p.file}:${p.line}  ${why}\n    ${p.text.slice(0, 160)}`)
  }
  console.log(`ATLAS ids: ${Object.keys(names).length} known, ${problems.length} problem(s)`)
  if (problems.length) process.exit(1)
}

if (require.main === module) main().catch(e => { console.error(`✗ ${e.message}`); process.exit(1) })

module.exports = { atlasNames, scan, check }
