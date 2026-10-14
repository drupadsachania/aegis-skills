'use strict'

const fs = require('fs')
const path = require('path')
const { REPO_ROOT } = require('../../lib/site-paths')
const C = require('../../lib/install-commands')

const pkg = d => JSON.parse(fs.readFileSync(path.join(REPO_ROOT, d, 'package.json'), 'utf8'))
const allCode = C.PATHS.flatMap(p => p.platforms.flatMap(pl => pl.steps.map(s => s.code || ''))).join('\n')

test('package names match the workspace packages (contracts §3)', () => {
  expect(C.PACKAGES.aegis).toBe(pkg('packages/aegis').name)
  expect(C.PACKAGES.themisPlugin).toBe(pkg('packages/themis-plugin').name)
  expect(C.PACKAGES.themisApp).toBe(pkg('packages/themis-app').name)
})

test('bins used by the commands exist', () => {
  expect(Object.keys(pkg('packages/aegis').bin)).toContain('aegis')
  expect(Object.keys(pkg('packages/themis-app').bin)).toContain('themis')
  const pluginBin = pkg('packages/themis-plugin').bin
  expect(typeof pluginBin === 'string' || Object.keys(pluginBin).length === 1).toBe(true) // npx needs one bin
})

test('marketplace name and plugin names match .claude-plugin/marketplace.json', () => {
  const m = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.claude-plugin', 'marketplace.json'), 'utf8'))
  expect(C.MARKETPLACE).toBe(m.name)
  // Themis is not listed until its plugin package is published (Phase 8); scripts/check-versions.js enforces the same rule.
  expect(m.plugins.map(p => p.name)).toEqual(['aegis-skills'])
})

test('no install command offers a marketplace install of a plugin the marketplace does not list', () => {
  const m = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.claude-plugin', 'marketplace.json'), 'utf8'))
  const listed = m.plugins.map(p => p.name)
  for (const hit of allCode.matchAll(/\/plugin install ([a-z-]+)@/g)) expect(listed).toContain(hit[1])
})

test('every --platform id is a real installer target', () => {
  const targets = fs.readFileSync(path.join(REPO_ROOT, 'packages', 'aegis', 'lib', 'targets.js'), 'utf8')
  for (const id of C.AEGIS_PLATFORM_IDS) expect(targets).toMatch(new RegExp(`['"]${id}['"]`))
  for (const m of allCode.matchAll(/install --platform ([a-z-]+)/g)) expect(C.AEGIS_PLATFORM_IDS).toContain(m[1])
})

test('the five paths are present in master-plan order with unique platform ids', () => {
  expect(C.PATHS.map(p => p.id)).toEqual(['zero-install', 'hosted-mcp', 'skill-pack', 'themis-plugin', 'themis-app'])
  for (const p of C.PATHS) {
    const ids = p.platforms.map(x => x.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(p.docs).toMatch(/^\/docs\//)
  }
})

test('no removed product appears in any command or note', () => {
  const all = JSON.stringify(C.PATHS)
  for (const bad of ['@aegis-skills/core', 'openai-action', 'ChatGPT Action', 'aegis compile', '/api/themis']) {
    expect(all).not.toContain(bad)
  }
  expect(allCode).toContain('npx @aegis-skills/themis dashboard')
  expect(allCode).toContain(C.MCP_URL)
})

const THEMIS_PATHS = ['themis-plugin', 'themis-app']

test('availability: Aegis items follow AEGIS_PUBLISHED; every Themis item is in-development', () => {
  expect(C.LATER).toBe('after-first-release')
  expect(C.IN_DEV).toBe('in-development')
  for (const p of C.PATHS) {
    for (const pl of p.platforms) {
      const label = `${p.id}/${pl.id}`
      if (THEMIS_PATHS.includes(p.id)) {
        // owner decision 2026-10-12: Themis is deferred on npm and the directories
        expect(`${label}: ${pl.availability}`).toBe(`${label}: ${C.IN_DEV}`)
      } else {
        expect(pl.availability).toBe(C.AEGIS_PUBLISHED || ['zero-install', 'hosted-mcp'].includes(p.id) ? undefined : C.LATER)
      }
    }
  }
  expect(C.PATHS.filter(p => THEMIS_PATHS.includes(p.id)).every(p => p.status === C.IN_DEV)).toBe(true)
  expect(C.PATHS.filter(p => !THEMIS_PATHS.includes(p.id)).every(p => !p.status)).toBe(true)
})

test('npm, marketplace and release based Aegis platforms are flagged until AEGIS_PUBLISHED is true', () => {
  const flagged = C.PATHS.flatMap(p => p.platforms.filter(pl => pl.availability === C.LATER).map(pl => pl.id))
  const aegisNeedsRelease = C.PATHS.filter(p => !p.id.startsWith('themis')).flatMap(p => p.platforms)
    .filter(pl => /npx |npm install|\/plugin |gemini extensions/.test(pl.steps.map(s => s.code || '').join(' ')))
  expect(aegisNeedsRelease.length).toBeGreaterThan(0)
  if (C.AEGIS_PUBLISHED) expect(flagged).toEqual([])
  else {
    expect(flagged.length).toBeGreaterThan(0)
    for (const pl of aegisNeedsRelease) expect(pl.availability).toBe(C.LATER)
  }
  // zero-install and the hosted MCP work from the website alone
  for (const id of ['zero-install', 'hosted-mcp']) {
    expect(C.PATHS.find(p => p.id === id).platforms.every(pl => !pl.availability)).toBe(true)
  }
})

// ---- the first-release flip is exactly one line (docs/RELEASE-RUNBOOK.md section 4) ----
const SRC = path.join(__dirname, '..', '..', 'lib', 'install-commands.js')
const load = source => {
  const Module = require('module')
  const m = new Module(SRC, null)
  m.filename = SRC
  m.paths = Module._nodeModulePaths(path.dirname(SRC))
  m._compile(source, SRC)
  return m.exports
}

test('AEGIS_PUBLISHED is the only switch: one declaration, no direct LATER flags on any row', () => {
  const src = fs.readFileSync(SRC, 'utf8')
  expect(src.match(/^const AEGIS_PUBLISHED = (true|false)/gm)).toHaveLength(1)
  expect(src.match(/{ availability: LATER }/g)).toHaveLength(1) // only inside AEGIS_AVAILABILITY
})

test('changing that one line to true removes every after-first-release marker and nothing else', () => {
  const src = fs.readFileSync(SRC, 'utf8')
  const withFlag = v => load(src.replace(/^const AEGIS_PUBLISHED = (true|false)/m, `const AEGIS_PUBLISHED = ${v}`))
  const before = withFlag(false)
  const flipped = withFlag(true)
  expect(before.AEGIS_PUBLISHED).toBe(false)
  expect(flipped.AEGIS_PUBLISHED).toBe(true)
  const flags = paths => paths.flatMap(p => p.platforms.map(pl => `${p.id}/${pl.id}:${pl.availability}`))
  const beforeFlags = flags(before.PATHS)
  const after = flags(flipped.PATHS)
  expect(after).toHaveLength(beforeFlags.length)
  expect(beforeFlags.filter(x => x.endsWith(':after-first-release')).length).toBeGreaterThan(0)
  expect(after.some(x => x.endsWith(':after-first-release'))).toBe(false)
  // Themis rows stay in-development, and no row carries an explicit undefined key (Next cannot serialise it)
  expect(after.filter(x => x.endsWith(':in-development'))).toEqual(beforeFlags.filter(x => x.endsWith(':in-development')))
  for (const p of flipped.PATHS) for (const pl of p.platforms) expect(Object.keys(pl).includes('availability') && pl.availability === undefined).toBe(false)
  // the commands themselves do not change
  expect(JSON.stringify(flipped.PATHS.map(p => p.platforms.map(pl => pl.steps)))).toBe(JSON.stringify(before.PATHS.map(p => p.platforms.map(pl => pl.steps))))
})
