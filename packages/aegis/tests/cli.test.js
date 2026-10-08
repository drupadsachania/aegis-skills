'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawnSync } = require('child_process')

const CLI = path.join(__dirname, '..', 'cli', 'aegis.js')
const PKG = require('../package.json')
const PACK = path.join(__dirname, '..', 'skills')
const SKILL_COUNT = fs.readdirSync(PACK).filter(n => fs.existsSync(path.join(PACK, n, 'SKILL.md'))).length

function sandbox () {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-cli-'))
  const home = path.join(root, 'home')
  const proj = path.join(root, 'proj')
  fs.mkdirSync(home)
  fs.mkdirSync(proj)
  const env = { ...process.env, HOME: home, USERPROFILE: home, AEGIS_HOME: path.join(home, '.aegis') }
  delete env.AEGIS_NO_AUTO_REFRESH
  const run = (args, extra = {}) => spawnSync(process.execPath, [CLI, ...args], { cwd: proj, encoding: 'utf8', env: { ...env, ...extra } })
  return { home, proj, env, run }
}

const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'))

test('--version prints the package version', () => {
  const { run } = sandbox()
  const r = run(['--version'])
  expect(r.status).toBe(0)
  expect(r.stdout.trim()).toBe(PKG.version)
})

test('an unknown platform is a usage error', () => {
  const { run } = sandbox()
  const r = run(['install', '--platform', 'chatgpt'])
  expect(r.status).toBe(2)
  expect(r.stderr).toMatch(/unknown platform "chatgpt"/)
})

test('install with nothing detected exits 1', () => {
  const { run } = sandbox()
  const r = run(['install'])
  expect(r.status).toBe(1)
  expect(r.stderr).toMatch(/no supported tool/)
})

test('claude --project installs skill content only and merges .mcp.json', () => {
  const { proj, run } = sandbox()
  fs.writeFileSync(path.join(proj, '.mcp.json'), JSON.stringify({ mcpServers: { other: { command: 'x' } } }))
  const r = run(['install', '--platform', 'claude', '--project'])
  expect(r.status).toBe(0)
  const skills = path.join(proj, '.claude', 'skills')
  expect(fs.readdirSync(skills)).toHaveLength(SKILL_COUNT)
  expect(fs.readdirSync(path.join(skills, 'compliance')).sort()).toEqual(['SKILL.md', 'references', 'skill.json'])
  const mcp = readJson(path.join(proj, '.mcp.json'))
  expect(mcp.mcpServers.other).toEqual({ command: 'x' })
  expect(mcp.mcpServers.aegis.type).toBe('stdio')
  expect(mcp.mcpServers.aegis.args).toContain('mcp')
  expect(fs.existsSync(path.join(proj, '.mcp.json.aegis.bak'))).toBe(true)
})

test('claude user scope merges ~/.claude.json without touching other keys', () => {
  const { home, run } = sandbox()
  fs.writeFileSync(path.join(home, '.claude.json'), JSON.stringify({ numStartups: 3, mcpServers: {} }))
  expect(run(['install', '--platform', 'claude']).status).toBe(0)
  const cfg = readJson(path.join(home, '.claude.json'))
  expect(cfg.numStartups).toBe(3)
  expect(cfg.mcpServers.aegis).toBeDefined()
  expect(fs.existsSync(path.join(home, '.claude', 'skills', 'mitre-attack', 'SKILL.md'))).toBe(true)
})

test('codex appends one TOML block and stays idempotent', () => {
  const { home, run } = sandbox()
  fs.mkdirSync(path.join(home, '.codex'))
  const toml = path.join(home, '.codex', 'config.toml')
  fs.writeFileSync(toml, 'model = "o3"\n\n[mcp_servers.other]\ncommand = "x"\n')
  expect(run(['install', '--platform', 'codex']).status).toBe(0)
  expect(run(['install', '--platform', 'codex']).status).toBe(0)
  const text = fs.readFileSync(toml, 'utf8')
  expect(text).toContain('model = "o3"')
  expect(text).toContain('[mcp_servers.other]')
  expect(text.match(/\[mcp_servers\.aegis\]/g)).toHaveLength(1)
  expect(fs.existsSync(path.join(home, '.agents', 'skills', 'compliance', 'SKILL.md'))).toBe(true)
})

test('vscode: project scope writes .vscode/mcp.json, user scope prints the CLI command', () => {
  const { home, proj, run } = sandbox()
  expect(run(['install', '--platform', 'vscode', '--project']).status).toBe(0)
  expect(readJson(path.join(proj, '.vscode', 'mcp.json')).servers.aegis.type).toBe('stdio')
  expect(fs.existsSync(path.join(proj, '.github', 'skills', 'compliance', 'SKILL.md'))).toBe(true)
  const r = run(['install', '--platform', 'vscode'])
  expect(r.status).toBe(0)
  expect(r.stdout).toContain('code --add-mcp')
  expect(fs.existsSync(path.join(home, '.copilot', 'skills', 'compliance', 'SKILL.md'))).toBe(true)
})

test('an unparseable MCP config is reported and left untouched', () => {
  const { proj, run } = sandbox()
  fs.mkdirSync(path.join(proj, '.cursor'))
  const file = path.join(proj, '.cursor', 'mcp.json')
  const text = '{\n  // my servers\n  "mcpServers": {}\n}\n'
  fs.writeFileSync(file, text)
  const r = run(['install', '--platform', 'cursor', '--project'])
  expect(r.status).toBe(0)
  expect(r.stdout).toMatch(/Refusing to edit/)
  expect(fs.readFileSync(file, 'utf8')).toBe(text)
  expect(fs.existsSync(path.join(proj, '.cursor', 'skills', 'compliance', 'SKILL.md'))).toBe(true)
})

test('a foreign skill folder is skipped, or backed up with --force', () => {
  const { proj, run } = sandbox()
  const mine = path.join(proj, '.claude', 'skills', 'compliance', 'SKILL.md')
  fs.mkdirSync(path.dirname(mine), { recursive: true })
  fs.writeFileSync(mine, 'mine')
  const r = run(['install', '--platform', 'claude', '--project'])
  expect(r.stdout).toMatch(/skipped compliance/)
  expect(fs.readFileSync(mine, 'utf8')).toBe('mine')
  expect(run(['install', '--platform', 'claude', '--project', '--force']).status).toBe(0)
  expect(fs.readFileSync(mine + '.bak', 'utf8')).toBe('mine')
  expect(fs.readFileSync(mine, 'utf8')).not.toBe('mine')
})

test('auto-refresh re-syncs stale installs and keeps edits as .bak', () => {
  const { home, proj, run } = sandbox()
  run(['install', '--platform', 'claude', '--project'])
  const file = path.join(proj, '.claude', 'skills', 'compliance', 'SKILL.md')
  const original = fs.readFileSync(file, 'utf8')
  fs.writeFileSync(file, 'my edit')
  const ledgerFile = path.join(home, '.aegis', 'installed.json')
  const l = readJson(ledgerFile)
  l.installs[0].version = '0.0.1'
  fs.writeFileSync(ledgerFile, JSON.stringify(l))

  expect(run(['list'], { AEGIS_NO_AUTO_REFRESH: '1' }).status).toBe(0)
  expect(fs.readFileSync(file, 'utf8')).toBe('my edit')

  const r = run(['list'])
  expect(r.status).toBe(0)
  expect(r.stderr).toMatch(/refreshed 1 install/)
  expect(fs.readFileSync(file, 'utf8')).toBe(original)
  expect(fs.readFileSync(file + '.bak', 'utf8')).toBe('my edit')
  expect(readJson(ledgerFile).installs[0].version).toBe(PKG.version)
})

test('uninstall removes files and MCP entries; a shared folder survives until the last platform', () => {
  const { proj, run } = sandbox()
  expect(run(['install', '--platform', 'codex,antigravity', '--project']).status).toBe(0)
  const dir = path.join(proj, '.agents', 'skills')
  expect(fs.readdirSync(dir)).toHaveLength(SKILL_COUNT)

  expect(run(['uninstall', '--platform', 'codex', '--project']).status).toBe(0)
  expect(fs.readdirSync(dir)).toHaveLength(SKILL_COUNT)
  expect(fs.readFileSync(path.join(proj, '.codex', 'config.toml'), 'utf8')).not.toContain('[mcp_servers.aegis]')

  expect(run(['uninstall', '--platform', 'antigravity', '--project']).status).toBe(0)
  expect(fs.existsSync(dir) ? fs.readdirSync(dir) : []).toHaveLength(0)
  expect(readJson(path.join(proj, '.agents', 'mcp_config.json')).mcpServers.aegis).toBeUndefined()
})

test('list --json reports bundled skills and installs', () => {
  const { run } = sandbox()
  run(['install', '--platform', 'gemini', '--project'])
  const info = JSON.parse(run(['list', '--json']).stdout)
  expect(info.version).toBe(PKG.version)
  expect(info.bundled).toHaveLength(SKILL_COUNT)
  expect(info.installs[0]).toMatchObject({ platform: 'gemini', scope: 'project', skills: SKILL_COUNT })
})

test('aegis mcp serves the three read-only tools on stdio', async () => {
  const { Client } = require('@modelcontextprotocol/sdk/client/index.js')
  const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js')
  const { env } = sandbox()
  const transport = new StdioClientTransport({ command: process.execPath, args: [CLI, 'mcp'], env })
  const client = new Client({ name: 'test', version: '1.0.0' })
  await client.connect(transport)
  const { tools } = await client.listTools()
  expect(tools.map(t => t.name).sort()).toEqual(['get_skill', 'get_skill_phase', 'list_skills'])
  await client.close()
}, 30000)
