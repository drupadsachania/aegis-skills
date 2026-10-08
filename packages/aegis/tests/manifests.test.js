'use strict'

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const REPO = path.join(ROOT, '..', '..')
const PKG = require('../package.json')
const read = (base, rel) => JSON.parse(fs.readFileSync(path.join(base, rel), 'utf8'))
const HOSTED = 'https://aegis-skills.vercel.app/api/mcp'

test('package.json carries the contract fields', () => {
  expect(PKG.name).toBe('aegis-skills')
  expect(PKG.mcpName).toBe('io.github.drupadsachania/aegis-skills')
  expect(PKG.bin).toEqual({ aegis: 'cli/aegis.js' })
  expect(PKG.license).toBe('(Apache-2.0 OR MIT)')
  expect(PKG.engines.node).toBe('>=24')
  expect(Object.keys(PKG.dependencies).sort()).toEqual(['@modelcontextprotocol/sdk', 'gray-matter', 'zod'])
  for (const k of ['./package.json', './mcp/server', './mcp/skill-reader', './mcp/skill-families']) expect(PKG.exports[k]).toBeDefined()
})

test('no bin/ folder at the plugin root (claude.ai and Cowork refuse such plugins)', () => {
  expect(fs.existsSync(path.join(ROOT, 'bin'))).toBe(false)
})

test('Claude plugin manifest and hosted MCP', () => {
  const plugin = read(ROOT, '.claude-plugin/plugin.json')
  expect(plugin.name).toBe('aegis')
  expect(plugin.version).toBe(PKG.version)
  expect(read(ROOT, '.mcp.json')).toEqual({ mcpServers: { aegis: { type: 'http', url: HOSTED } } })
})

test('root marketplace lists the aegis plugin by relative path', () => {
  const m = read(REPO, '.claude-plugin/marketplace.json')
  expect(m.name).toBe('aegis-skills')
  expect(m.owner.name).toBeTruthy()
  const entry = m.plugins.find(p => p.name === 'aegis')
  expect(entry.source).toBe('./packages/aegis')
  expect(entry.version).toBe(PKG.version)
  expect(fs.existsSync(path.join(REPO, entry.source, '.claude-plugin', 'plugin.json'))).toBe(true)
})

test('Gemini extension pins the exact package version', () => {
  const g = read(ROOT, 'gemini-extension.json')
  expect(g.name).toBe('aegis-skills')
  expect(g.version).toBe(PKG.version)
  expect(g.contextFileName).toBe('GEMINI.md')
  expect(fs.existsSync(path.join(ROOT, 'GEMINI.md'))).toBe(true)
  expect(g.mcpServers.aegis.command).toBe('npx')
  expect(g.mcpServers.aegis.args).toEqual(['-y', `aegis-skills@${PKG.version}`, 'mcp'])
})

test('MCP Registry server.json', () => {
  const s = read(ROOT, 'server.json')
  expect(s.name).toBe(PKG.mcpName)
  expect(s.description.length).toBeLessThanOrEqual(100)
  expect(s.version).toBe(PKG.version)
  expect(s.packages[0]).toMatchObject({ registryType: 'npm', identifier: PKG.name, version: PKG.version, transport: { type: 'stdio' } })
  expect(s.packages[0].packageArguments).toEqual([{ type: 'positional', value: 'mcp' }])
  expect(s.remotes).toEqual([{ type: 'streamable-http', url: HOSTED }])
})
