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
  expect(m.plugins.map(p => p.name)).toEqual(expect.arrayContaining(['aegis', 'themis']))
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

test('availability: Aegis items are after-first-release or available; every Themis item is in-development', () => {
  expect(C.LATER).toBe('after-first-release')
  expect(C.IN_DEV).toBe('in-development')
  for (const p of C.PATHS) {
    for (const pl of p.platforms) {
      const label = `${p.id}/${pl.id}`
      if (THEMIS_PATHS.includes(p.id)) {
        // owner decision 2026-10-12: Themis is deferred on npm and the directories
        expect(`${label}: ${pl.availability}`).toBe(`${label}: ${C.IN_DEV}`)
      } else {
        expect([undefined, C.LATER]).toContain(pl.availability)
      }
    }
  }
  expect(C.PATHS.filter(p => THEMIS_PATHS.includes(p.id)).every(p => p.status === C.IN_DEV)).toBe(true)
  expect(C.PATHS.filter(p => !THEMIS_PATHS.includes(p.id)).every(p => !p.status)).toBe(true)
})

test('npm, marketplace and release based Aegis platforms are flagged as not yet available', () => {
  const flagged = C.PATHS.flatMap(p => p.platforms.filter(pl => pl.availability === C.LATER).map(pl => pl.id))
  expect(flagged.length).toBeGreaterThan(0)
  const aegisNeedsRelease = C.PATHS.filter(p => !p.id.startsWith('themis')).flatMap(p => p.platforms)
    .filter(pl => /npx |npm install|\/plugin |gemini extensions/.test(pl.steps.map(s => s.code || '').join(' ')))
  expect(aegisNeedsRelease.length).toBeGreaterThan(0)
  for (const pl of aegisNeedsRelease) expect(pl.availability).toBe(C.LATER)
  // zero-install and the hosted MCP work from the website alone
  for (const id of ['zero-install', 'hosted-mcp']) {
    expect(C.PATHS.find(p => p.id === id).platforms.every(pl => !pl.availability)).toBe(true)
  }
})
