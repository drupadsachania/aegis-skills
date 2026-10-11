'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { checkPlugin, checkLauncher, PLUGINS } = require('../check-plugin-bundle')

const ROOT = path.join(__dirname, '..', '..')
const README = Array.from({ length: 45 }, (_, i) => `word${i}`).join(' ')

function make (files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-bundle-'))
  const base = {
    'README.md': README,
    LICENSE: 'MIT',
    '.claude-plugin/plugin.json': JSON.stringify({ name: 'demo', version: '1.0.0', description: 'x' }),
    'skills/one/SKILL.md': '---\nname: one\ndescription: A skill.\n---\nBody\n'
  }
  for (const [rel, content] of Object.entries({ ...base, ...files })) {
    if (content === null) continue
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true })
    fs.writeFileSync(path.join(dir, rel), content)
  }
  return dir
}

const has = (errs, text) => errs.some(e => e.includes(text))

test('the real plugin folders pass', () => {
  for (const rel of PLUGINS) expect({ rel, errors: checkPlugin(path.join(ROOT, rel)) }).toEqual({ rel, errors: [] })
})

test('a minimal compliant plugin passes', () => {
  expect(checkPlugin(make({}))).toEqual([])
})

test('short README, missing LICENSE and bad front matter are blockers', () => {
  expect(has(checkPlugin(make({ 'README.md': 'too short' })), 'README.md has 2 words')).toBe(true)
  expect(has(checkPlugin(make({ LICENSE: null })), 'no LICENSE')).toBe(true)
  expect(has(checkPlugin(make({ 'skills/one/SKILL.md': '---\nname: [unclosed\n---\n' })), 'invalid YAML')).toBe(true)
  expect(has(checkPlugin(make({ 'agents/a.md': 'no front matter' })), 'no YAML front matter')).toBe(true)
  expect(has(checkPlugin(make({ 'skills/two/skill.md': '---\nname: two\ndescription: d\n---\n' })), 'exactly SKILL.md')).toBe(true)
})

test('unpinned launchers are blockers, exact pins pass', () => {
  expect(checkLauncher('a', { command: 'npx', args: ['-y', 'pkg@1.2.3', 'run'] })).toEqual([])
  expect(checkLauncher('a', { command: 'npx', args: ['-y', '@scope/pkg@1.2.3'] })).toEqual([])
  expect(checkLauncher('a', { command: 'npx', args: ['-y', 'pkg'] }).length).toBe(1)
  expect(checkLauncher('a', { command: 'npx', args: ['pkg@latest'] }).length).toBe(1)
  expect(checkLauncher('a', { command: 'npx', args: ['pkg@^1.2.3'] }).length).toBe(1)
  expect(checkLauncher('a', { command: 'node', args: ['server.js'] })).toEqual([])
  const errs = checkPlugin(make({ '.mcp.json': JSON.stringify({ mcpServers: { x: { command: 'npx', args: ['-y', 'pkg'] } } }) }))
  expect(has(errs, 'pin an exact version')).toBe(true)
})

test('reserved and non-ASCII names, escaping paths and credentials are flagged', () => {
  const manifest = n => JSON.stringify({ name: n, version: '1.0.0', description: 'x' })
  expect(has(checkPlugin(make({ '.claude-plugin/plugin.json': manifest('claude-tools') })), 'reserved word')).toBe(true)
  expect(has(checkPlugin(make({ '.claude-plugin/plugin.json': manifest('my-test') })), 'reserved word')).toBe(true)
  expect(has(checkPlugin(make({ 'café.md': 'x' })), 'non-ASCII')).toBe(true)
  const esc = JSON.stringify({ name: 'demo', description: 'x', skills: '../outside' })
  expect(has(checkPlugin(make({ '.claude-plugin/plugin.json': esc })), 'outside the plugin folder')).toBe(true)
  expect(has(checkPlugin(make({ 'config.txt': 'key ghp_' + 'a'.repeat(36) })), 'real credential')).toBe(true)
})

test('size, binary, lockfile and minified holds are reported', () => {
  expect(has(checkPlugin(make({ 'big.txt': 'x'.repeat(257 * 1024) })), 'hold limit 256 KiB')).toBe(true)
  expect(has(checkPlugin(make({ 'tool.exe': 'x' })), 'binary file')).toBe(true)
  expect(checkPlugin(make({ 'logo.png': 'x' }))).toEqual([])
  expect(has(checkPlugin(make({ 'package-lock.json': '{}' })), 'lockfile')).toBe(true)
  expect(has(checkPlugin(make({ 'a.min.js': 'x' })), 'minified')).toBe(true)
})
