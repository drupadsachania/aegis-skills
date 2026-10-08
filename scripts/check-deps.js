#!/usr/bin/env node
'use strict'

/**
 * Dependency guard. A guarded workspace package may only declare, and only
 * require at runtime, its allowlisted packages. Later phases add rules here
 * (Phase 2: themis-core may not import LangChain, LangGraph or model SDKs).
 * Usage: node scripts/check-deps.js        (exit 1 on any violation)
 */

const fs = require('fs')
const path = require('path')
const { builtinModules } = require('module')

const ROOT = path.join(__dirname, '..')
const RULES = {
  'packages/aegis': { allow: ['@modelcontextprotocol/sdk', 'gray-matter', 'zod'], max: 4, scan: ['cli', 'lib', 'mcp'] }
}
const BUILTIN = new Set(builtinModules)
const REQUIRE_RE = /(?:require\(\s*|from\s+|import\(\s*)['"]([^'"]+)['"]/g

const packageName = spec => (spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0])

function jsFiles (dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) return jsFiles(p)
    return /\.(c?js|mjs)$/.test(e.name) ? [p] : []
  })
}

function checkPackage (dir, rule) {
  const errors = []
  const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
  const deps = Object.keys(pkg.dependencies || {})
  if (deps.length > rule.max) errors.push(`${deps.length} runtime dependencies (max ${rule.max})`)
  for (const d of deps) if (!rule.allow.includes(d)) errors.push(`dependency "${d}" is not allowlisted`)
  for (const field of ['peerDependencies', 'optionalDependencies', 'bundleDependencies', 'bundledDependencies']) {
    const v = pkg[field]
    if (v && (Array.isArray(v) ? v.length : Object.keys(v).length)) errors.push(`"${field}" is not allowed`)
  }
  for (const file of rule.scan.flatMap(s => jsFiles(path.join(dir, s)))) {
    const src = fs.readFileSync(file, 'utf8')
    for (const m of src.matchAll(REQUIRE_RE)) {
      const spec = m[1]
      if (spec.startsWith('.') || spec.startsWith('node:') || BUILTIN.has(spec) || BUILTIN.has(spec.split('/')[0])) continue
      const name = packageName(spec)
      if (name === pkg.name) continue
      if (!deps.includes(name)) errors.push(`${path.relative(dir, file)} requires "${spec}", which is not a declared dependency`)
    }
  }
  return errors
}

function main () {
  let count = 0
  for (const [rel, rule] of Object.entries(RULES)) {
    const dir = path.join(ROOT, rel)
    if (!fs.existsSync(path.join(dir, 'package.json'))) { console.error(`✗ ${rel}: package.json missing`); count++; continue }
    for (const e of checkPackage(dir, rule)) { console.error(`✗ ${rel}: ${e}`); count++ }
  }
  console.log(`check-deps: ${count} violation(s)`)
  if (count > 0) process.exit(1)
}

if (require.main === module) main()

module.exports = { checkPackage, RULES }
