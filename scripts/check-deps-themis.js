#!/usr/bin/env node
'use strict'
// Themis dependency + invariant guard (Phase 2).
//  - themis-core:    only node: built-ins, zod and its own src/ files.
//  - themis-gateway: only node: built-ins, zod, @aegis-skills/themis-core,
//                    @modelcontextprotocol/sdk and its own src/ files.
//  - Approval invariant (contracts §6): only allowlisted files may call
//    `.decideApproval(`. Phase 3 added the plugin elicitation handler; Phase 4 adds
//    the dashboard approval route to APPROVAL_DECIDERS.
//  - themis-app: only node: built-ins, zod, the LangChain/LangGraph packages, core, gateway and aegis-skills.
const fs = require('node:fs')
const path = require('node:path')
const { builtinModules } = require('node:module')

const ROOT = path.resolve(__dirname, '..')
const RULES = [
  { name: '@aegis-skills/themis-core', dir: 'packages/themis-core', allowed: ['zod'] },
  { name: '@aegis-skills/themis-gateway', dir: 'packages/themis-gateway', allowed: ['zod', '@aegis-skills/themis-core', '@modelcontextprotocol/sdk'] },
  { name: '@aegis-skills/themis-plugin', dir: 'packages/themis-plugin', allowed: ['zod', '@aegis-skills/themis-core', '@aegis-skills/themis-gateway', '@modelcontextprotocol/sdk'], allowOwnPackageJson: true },
  { name: '@aegis-skills/themis', dir: 'packages/themis-app', allowed: ['zod', '@langchain/core', '@langchain/openai', '@langchain/anthropic', '@langchain/google-genai', '@langchain/langgraph', '@langchain/langgraph-checkpoint', '@aegis-skills/themis-core', '@aegis-skills/themis-gateway', 'aegis-skills'], allowOwnPackageJson: true },
]
const APPROVAL_DECIDERS = ['packages/themis-plugin/src/approval.ts', 'packages/themis-app/src/server/routes/approvals.ts'] // repo-relative posix paths
const INVARIANT_DIRS = ['packages', 'apps/web/lib', 'apps/web/app']
const SKIP_DIRS = new Set(['node_modules', 'dist', '.next', 'coverage', 'test', '__tests__'])
const SPEC_RES = [
  /\bimport\s+(?:type\s+)?[\w*{}\s,]*?\bfrom\s*['"]([^'"]+)['"]/g,
  /\bimport\s*['"]([^'"]+)['"]/g,
  /\bexport\s+(?:type\s+)?(?:\*(?:\s+as\s+\w+)?|\{[^}]*\})\s*from\s*['"]([^'"]+)['"]/g,
  /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\bgetBuiltinModule\(\s*['"]([^'"]+)['"]\s*\)/g,
]

const blank = (s) => s.replace(/[^\n]/g, ' ')
// Replace comments with spaces so offsets (and line numbers) are preserved.
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, blank)
  .replace(/(^|[^:'"`\\])(\/\/[^\n]*)/g, (_m, pre, c) => pre + blank(c))
const lineOf = (src, i) => src.slice(0, i).split('\n').length
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/')
const pkgOf = (spec) => (spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0])

function* walk(dir) {
  if (!fs.existsSync(dir)) return
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) yield* walk(p)
    else if (/\.(ts|tsx|js|cjs|mjs)$/.test(e.name) && !/\.d\.ts$/.test(e.name)) yield p
  }
}

function checkSpec(rule, file, spec) {
  if (spec.startsWith('.')) {
    const target = path.resolve(path.dirname(file), spec)
    if (rule.allowOwnPackageJson && target === path.join(ROOT, rule.dir, 'package.json')) return null
    return target.startsWith(path.join(ROOT, rule.dir, 'src')) ? null : 'relative import escapes the package src/'
  }
  if (spec.startsWith('node:')) return null
  if (builtinModules.includes(spec.split('/')[0])) return `use the node: prefix ('node:${spec}')`
  if (rule.allowed.includes(pkgOf(spec))) return null
  return `'${pkgOf(spec)}' is not an allowed dependency of ${rule.name}`
}

const errors = []
const counts = {}
for (const rule of RULES) {
  const pkgFile = path.join(ROOT, rule.dir, 'package.json')
  if (!fs.existsSync(pkgFile)) { errors.push(`${rule.dir}: package.json missing`); continue }
  const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'))
  for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const dep of Object.keys(pkg[field] || {})) {
      if (!rule.allowed.includes(dep)) errors.push(`${rule.dir}/package.json: ${field} '${dep}' is not allowed`)
    }
  }
  counts[rule.name] = 0
  for (const file of walk(path.join(ROOT, rule.dir, 'src'))) {
    counts[rule.name]++
    const src = stripComments(fs.readFileSync(file, 'utf8'))
    for (const re of SPEC_RES) {
      re.lastIndex = 0
      let m
      while ((m = re.exec(src))) {
        const problem = checkSpec(rule, file, m[1])
        if (problem) errors.push(`${rel(file)}:${lineOf(src, m.index)}: ${problem}`)
      }
    }
  }
}

for (const d of INVARIANT_DIRS) {
  for (const file of walk(path.join(ROOT, d))) {
    const src = stripComments(fs.readFileSync(file, 'utf8'))
    const re = /\.decideApproval\s*\(/g
    let m
    while ((m = re.exec(src))) {
      if (!APPROVAL_DECIDERS.includes(rel(file))) {
        errors.push(`${rel(file)}:${lineOf(src, m.index)}: only human approval channels may call decideApproval (contracts §6)`)
      }
    }
  }
}

if (errors.length) {
  console.error(`check-deps-themis: ${errors.length} problem(s)`)
  for (const e of errors) console.error(`  ${e}`)
  process.exit(1)
}
console.log(`check-deps-themis: OK (${Object.entries(counts).map(([n, c]) => `${n}: ${c} files`).join(', ')})`)
