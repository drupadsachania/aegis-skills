import fs from 'node:fs'
import path from 'node:path'
import { useTempHome } from '../helpers/fixtures'
import { loadConfig, saveConfig, setConfigValue, getConfigValue, paths, ConfigError } from '../../src/config/config'

describe('config', () => {
  const home = useTempHome()

  it('returns defaults when no config file exists', () => {
    const c = loadConfig()
    expect(c.dashboard.port).toBe(9120)
    expect(c.local.baseURL).toBe('http://127.0.0.1:11434/v1')
    expect(c.local.toolCalling).toBe('unknown')
    expect(c.limits.maxConcurrentRuns).toBe(1)
    expect(c.defaultProvider).toBeNull()
  })

  it('follows THEMIS_HOME on every call', () => {
    expect(paths().config).toBe(path.join(home.dir(), 'config.json'))
  })

  it('round-trips a dotted set/get with JSON coercion', () => {
    setConfigValue('limits.maxConcurrentRuns', '2')
    setConfigValue('models.anthropic.fast', 'claude-haiku-4-5-20251001')
    const c = loadConfig()
    expect(getConfigValue(c, 'limits.maxConcurrentRuns')).toBe(2)
    expect(getConfigValue(c, 'models.anthropic.fast')).toBe('claude-haiku-4-5-20251001')
  })

  it('rejects out-of-range values and unknown keys', () => {
    expect(() => setConfigValue('limits.maxConcurrentRuns', '9')).toThrow(ConfigError)
    expect(() => setConfigValue('limits.nope', '1')).toThrow(ConfigError)
    expect(() => setConfigValue('nope', '1')).toThrow(ConfigError)
  })

  it('normalises mcpServers through core loadMcpServers (invalid entries dropped)', () => {
    setConfigValue('mcpServers', JSON.stringify([
      { id: 'osint', transport: 'http', url: 'https://mcp.example.test/x', allowedSkills: ['*'] },
      { id: 'BAD ID', transport: 'http', url: 'https://x.test' },
    ]))
    const servers = loadConfig().mcpServers as Array<{ id: string; maxCalls: number }>
    expect(servers.map((s) => s.id)).toEqual(['osint'])
    expect(servers[0].maxCalls).toBe(5)
  })

  it('rejects a corrupt config file with a ConfigError', () => {
    fs.mkdirSync(home.dir(), { recursive: true })
    fs.writeFileSync(paths().config, '{not json')
    expect(() => loadConfig()).toThrow(ConfigError)
  })

  const itPosix = process.platform === 'win32' ? it.skip : it
  itPosix('writes config.json with mode 0600', () => {
    saveConfig(loadConfig())
    expect(fs.statSync(paths().config).mode & 0o777).toBe(0o600)
  })
})
