'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const w = require('../lib/config-writers')
const { mcpEntry, PLATFORM_IDS, TARGETS } = require('../lib/targets')

const tmp = name => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-writers-')), name)
const entry = { command: 'npx', args: ['-y', 'aegis-skills@1', 'mcp'] }

describe('targets', () => {
  test('ids are fixed and every row has docs and a verification date', () => {
    expect(PLATFORM_IDS).toEqual(['claude', 'codex', 'gemini', 'cursor', 'vscode', 'antigravity'])
    for (const id of PLATFORM_IDS) {
      expect(TARGETS[id].verifiedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(TARGETS[id].docs.length).toBeGreaterThan(0)
    }
  })

  test('npx entry is wrapped in cmd /c on Windows only', () => {
    expect(mcpEntry('npx', 'win32')).toEqual({ command: 'cmd', args: ['/c', 'npx', '-y', 'aegis-skills@1', 'mcp'] })
    expect(mcpEntry('npx', 'linux')).toEqual({ command: 'npx', args: ['-y', 'aegis-skills@1', 'mcp'] })
    expect(mcpEntry('local').args[1]).toBe('mcp')
  })
})

describe('JSON configs', () => {
  test('creates a missing file', () => {
    const f = tmp('mcp.json')
    expect(w.upsertJsonServer(f, 'mcpServers', 'aegis', entry)).toBe(true)
    expect(JSON.parse(fs.readFileSync(f, 'utf8'))).toEqual({ mcpServers: { aegis: entry } })
    expect(fs.existsSync(f + '.aegis.bak')).toBe(false)
  })

  test('merges, backs up and is idempotent', () => {
    const f = tmp('settings.json')
    fs.writeFileSync(f, JSON.stringify({ theme: 'dark', mcpServers: { other: { command: 'x' } } }))
    expect(w.upsertJsonServer(f, 'mcpServers', 'aegis', entry)).toBe(true)
    const data = JSON.parse(fs.readFileSync(f, 'utf8'))
    expect(data.theme).toBe('dark')
    expect(data.mcpServers.other).toEqual({ command: 'x' })
    expect(JSON.parse(fs.readFileSync(f + '.aegis.bak', 'utf8')).mcpServers.aegis).toBeUndefined()
    expect(w.upsertJsonServer(f, 'mcpServers', 'aegis', entry)).toBe(false)
  })

  test('refuses files that are not plain JSON and leaves them untouched', () => {
    const f = tmp('mcp.json')
    const text = '{\n  // comment\n  "servers": {}\n}\n'
    fs.writeFileSync(f, text)
    expect(() => w.upsertJsonServer(f, 'servers', 'aegis', entry)).toThrow(/Refusing to edit/)
    expect(fs.readFileSync(f, 'utf8')).toBe(text)
  })

  test('removes only the aegis entry', () => {
    const f = tmp('mcp.json')
    fs.writeFileSync(f, JSON.stringify({ mcpServers: { other: {}, aegis: entry } }))
    expect(w.removeJsonServer(f, 'mcpServers', 'aegis')).toBe(true)
    expect(JSON.parse(fs.readFileSync(f, 'utf8'))).toEqual({ mcpServers: { other: {} } })
    expect(w.removeJsonServer(f, 'mcpServers', 'aegis')).toBe(false)
    expect(w.removeJsonServer(tmp('absent.json'), 'mcpServers', 'aegis')).toBe(false)
  })
})

describe('TOML configs', () => {
  const BASE = 'model = "o3"\n\n[mcp_servers.other]\ncommand = "x"\n\n[profiles.fast]\nmodel = "mini"\n'

  test('appends one managed block and keeps everything else', () => {
    const f = tmp('config.toml')
    fs.writeFileSync(f, BASE)
    expect(w.upsertTomlServer(f, 'aegis', entry)).toBe(true)
    expect(w.upsertTomlServer(f, 'aegis', entry)).toBe(false)
    const text = fs.readFileSync(f, 'utf8')
    expect(text.startsWith(BASE.trimEnd())).toBe(true)
    expect(text.match(/\[mcp_servers\.aegis\]/g)).toHaveLength(1)
    expect(text).toContain('# managed by aegis-skills\n[mcp_servers.aegis]\ncommand = "npx"\nargs = ["-y", "aegis-skills@1", "mcp"]\n')
    expect(fs.existsSync(f + '.aegis.bak')).toBe(true)
  })

  test('replaces an existing block (with sub-tables) in place', () => {
    const f = tmp('config.toml')
    fs.writeFileSync(f, '[mcp_servers.aegis]\ncommand = "old"\n\n[mcp_servers.aegis.env]\nA = "1"\n\n[profiles.fast]\nmodel = "mini"\n')
    expect(w.upsertTomlServer(f, 'aegis', entry)).toBe(true)
    const text = fs.readFileSync(f, 'utf8')
    expect(text).not.toContain('"old"')
    expect(text).not.toContain('[mcp_servers.aegis.env]')
    expect(text).toContain('[profiles.fast]\nmodel = "mini"')
  })

  test('Windows paths are escaped as TOML basic strings', () => {
    const f = tmp('config.toml')
    w.upsertTomlServer(f, 'aegis', { command: 'C:\\Program Files\\nodejs\\node.exe', args: ['mcp'] })
    expect(fs.readFileSync(f, 'utf8')).toContain('command = "C:\\\\Program Files\\\\nodejs\\\\node.exe"')
  })

  test('removes the block', () => {
    const f = tmp('config.toml')
    fs.writeFileSync(f, BASE)
    w.upsertTomlServer(f, 'aegis', entry)
    expect(w.removeTomlServer(f, 'aegis')).toBe(true)
    expect(fs.readFileSync(f, 'utf8').trimEnd()).toBe(BASE.trimEnd())
    expect(w.removeTomlServer(f, 'aegis')).toBe(false)
  })
})
