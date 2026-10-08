#!/usr/bin/env node
'use strict'

/**
 * Layout guard for the Aegis/Themis monorepo (restructure Phase 0; later phases update the lists).
 *   node scripts/check-layout.js          files, git-tracked paths, package manifests
 *   node scripts/check-layout.js --trace  also the apps/web/.next trace files (after `next build`)
 * Prints every problem and exits 1 on failure.
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const ROOT = path.join(__dirname, '..')
const at = p => path.join(ROOT, p)
const problems = []

const MUST_EXIST = [
  'package.json', 'package-lock.json', 'jest.config.js', 'tsconfig.base.json',
  'LICENSE', 'LICENSE-APACHE', 'LICENSE-MIT', 'SECURITY.md', 'README.md',
  '.github/workflows/skill-health.yml', '.claude-plugin/marketplace.json',
  'scripts/intel-sync.js', 'scripts/intel-routing.js', 'scripts/skill-health.js',
  'scripts/lint-skills.js', 'scripts/migrate-skill-frontmatter.js', 'scripts/build-flat-prompts.js', 'scripts/sync-skill-tokens.js',
  'packages/aegis/package.json', 'packages/aegis/health.json', 'packages/aegis/skills',
  'apps/web/package.json', 'apps/web/next.config.js', 'apps/web/jest.config.js', 'apps/web/jest.setup.js',
  'apps/web/tsconfig.json', 'apps/web/next-env.d.ts', 'apps/web/postcss.config.js', 'apps/web/tailwind.config.js',
  'apps/web/lib/skill-reader.js', 'apps/web/lib/aegis-paths.js', 'apps/web/lib/themis/index.ts',
  'packages/aegis/cli/aegis.js', 'packages/aegis/lib/installer.js',
  'packages/aegis/mcp/server.js', 'packages/aegis/mcp/stdio.js', 'packages/aegis/mcp/skill-reader.js',
  'packages/aegis/mcp/skill-families.js', 'packages/aegis/lib/skill-meta.js', 'packages/aegis/lib/targets.js',
  'packages/aegis/lib/config-writers.js', 'packages/aegis/lib/ledger.js',
  'apps/web/app/api/mcp/route.ts', 'apps/web/pages/index.js', 'apps/web/components/Layout.js',
  'apps/web/styles/globals.css', 'apps/web/supabase/migrations', 'packages/aegis/tests/mcp-server.test.js',
  'scripts/tests/fixtures/legacy/test-skill/SKILL.md'
]
const MUST_NOT_EXIST = [
  'skills', 'lib', 'src', 'app', 'pages', 'components', 'styles', 'bin', 'supabase', 'tests', '__tests__',
  'health.json', '.intel-sync-state.json', 'next.config.js', 'tsconfig.json', 'postcss.config.js',
  'tailwind.config.js', 'jest.setup.js', 'next-env.d.ts', 'run-supply-chain-fix.js', '.npmignore', 'tsconfig.tsbuildinfo'
]
const TRACKED_TOP = new Set([
  '.claude', '.claude-plugin', '.github', '.gitignore', '.npmrc', 'LICENSE', 'LICENSE-APACHE', 'LICENSE-MIT', 'SECURITY.md',
  'README.md', 'package.json', 'package-lock.json', 'jest.config.js', 'tsconfig.base.json',
  'apps', 'packages', 'scripts', 'docs'
])
const PACKAGES = [
  ['package.json', 'aegis-skills-monorepo'],
  ['apps/web/package.json', '@aegis-skills/web'],
  ['packages/aegis/package.json', 'aegis-skills']
]

for (const p of MUST_EXIST) if (!fs.existsSync(at(p))) problems.push(`missing: ${p}`)
for (const p of MUST_NOT_EXIST) if (fs.existsSync(at(p))) problems.push(`should have moved: ${p}`)

const skillsDir = at('packages/aegis/skills')
const skills = fs.existsSync(skillsDir)
  ? fs.readdirSync(skillsDir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name)
  : []
if (skills.length !== 24) problems.push(`expected 24 skills in packages/aegis/skills, found ${skills.length}`)
for (const s of skills) {
  for (const f of ['SKILL.md', 'skill.json']) {
    if (!fs.existsSync(path.join(skillsDir, s, f))) problems.push(`missing: packages/aegis/skills/${s}/${f}`)
  }
}

const tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean)
const stray = tracked.filter(f => !TRACKED_TOP.has(f.split('/')[0]))
for (const f of stray.slice(0, 20)) problems.push(`unexpected tracked path: ${f}`)
if (stray.length > 20) problems.push(`…and ${stray.length - 20} more unexpected tracked paths`)
if (tracked.some(f => f.startsWith('graphify-out/'))) problems.push('graphify-out/ must not be tracked')

for (const [file, name] of PACKAGES) {
  let j = {}
  try { j = JSON.parse(fs.readFileSync(at(file), 'utf8')) } catch (e) { problems.push(`unreadable: ${file}`); continue }
  if (j.name !== name) problems.push(`${file}: name should be ${name}, is ${j.name}`)
  if (j.license !== '(Apache-2.0 OR MIT)') problems.push(`${file}: license should be (Apache-2.0 OR MIT)`)
  if (!j.engines || j.engines.node !== '>=24') problems.push(`${file}: engines.node should be >=24`)
  if (file === 'package.json') {
    if (j.private !== true) problems.push('root package.json must be private')
    if (JSON.stringify(j.workspaces) !== JSON.stringify(['packages/*', 'apps/*'])) problems.push('root workspaces must be ["packages/*","apps/*"]')
  }
}

const trace = process.argv.includes('--trace')
if (trace) {
  const WANT = ['packages/aegis/skills/mitre-attack/SKILL.md', 'packages/aegis/skills/mitre-attack/skill.json', 'packages/aegis/health.json']
  for (const t of ['pages/index.js', 'pages/api/skills.js', 'pages/api/health.js', 'app/api/mcp/route.js']) {
    const f = at(`apps/web/.next/server/${t}.nft.json`)
    if (!fs.existsSync(f)) { problems.push(`missing trace file: apps/web/.next/server/${t}.nft.json`); continue }
    const files = JSON.parse(fs.readFileSync(f, 'utf8')).files.map(x => x.replace(/\\/g, '/'))
    for (const w of WANT) if (!files.some(x => x.endsWith(w))) problems.push(`${t}.nft.json does not include ${w}`)
    if (!files.some(x => /packages\/aegis\/skills\/[^/]+\/references\/[^/]+\.md$/.test(x))) problems.push(`${t}.nft.json includes no references/*.md`)
  }
}

if (problems.length) {
  console.error(`Layout check FAILED (${problems.length}):`)
  for (const p of problems) console.error('  - ' + p)
  process.exit(1)
}
console.log(`Layout check passed${trace ? ' (with trace)' : ''}: ${skills.length} skills, ${tracked.length} tracked files.`)
