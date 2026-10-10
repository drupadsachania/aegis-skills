import { Readable } from 'node:stream'
import { useTempHome, makeSkillPack } from '../helpers/fixtures'
import { ScriptedChatModel } from '../helpers/scripted-model'
import { standardScript } from '../helpers/test-deps'
import { setAegisRootForTests } from '../../src/versions'
import { setChatModelFactoryForTests } from '../../src/providers/models'
import { KeyStore } from '../../src/config/keys'
import { setConfigValue } from '../../src/config/config'
import { main } from '../../src/cli'

// Case 8 swaps the real MCP gateway for the in-memory fake (same contract). No servers
// are reachable in tests, so this is the only way to produce an approval request.
jest.mock('@aegis-skills/themis-gateway', () => {
  const real = jest.requireActual('@aegis-skills/themis-gateway')
  return {
    ...real,
    createGateway: (o: { store: unknown; skill: string; runId: string }) =>
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../helpers/fake-gateway').fakeGatewayFactory(o.store).factory(o),
  }
})

useTempHome()

const PLAN = [{ id: 'a', description: 'Check controls', skill: 'compliance', phase: 0, dependsOn: [] as string[] }]

describe('themis CLI', () => {
  let stdout = ''
  let stderr = ''
  beforeEach(() => {
    stdout = ''
    stderr = ''
    jest.spyOn(process.stdout, 'write').mockImplementation((s: string | Uint8Array) => { stdout += String(s); return true })
    jest.spyOn(process.stderr, 'write').mockImplementation((s: string | Uint8Array) => { stderr += String(s); return true })
    for (const k of ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GOOGLE_API_KEY', 'THEMIS_LOCAL_API_KEY']) delete process.env[k]
    setAegisRootForTests(makeSkillPack([{ name: 'compliance', phases: ['scope-definition'] }]))
  })
  afterEach(() => {
    jest.restoreAllMocks()
    setChatModelFactoryForTests(null)
    setAegisRootForTests(null)
  })

  it('prints help', async () => {
    expect(await main(['--help'])).toBe(0)
    expect(stdout).toContain('themis dashboard')
  })

  it('prints the version', async () => {
    expect(await main(['--version'])).toBe(0)
    expect(stdout).toMatch(/^themis \d+\.\d+\.\d+ \(Aegis /)
  })

  it('rejects an unknown command', async () => {
    expect(await main(['bogus'])).toBe(2)
  })

  it('gets and sets validated config', async () => {
    expect(await main(['config', 'set', 'limits.maxConcurrentRuns', '2'])).toBe(0)
    stdout = ''
    expect(await main(['config', 'get', 'limits.maxConcurrentRuns'])).toBe(0)
    expect(stdout.trim()).toBe('2')
    expect(await main(['config', 'set', 'limits.maxConcurrentRuns', '9'])).toBe(1)
    expect(stderr).toContain('Invalid config')
  })

  it('stores a key from stdin and never prints it in full', async () => {
    const real = Object.getOwnPropertyDescriptor(process, 'stdin')!
    Object.defineProperty(process, 'stdin', { value: Readable.from(['sk-ant-api03-FAKE-CLI-KEY-1234\n']), configurable: true })
    try {
      expect(await main(['keys', 'set', 'anthropic', '--stdin'])).toBe(0)
    } finally {
      Object.defineProperty(process, 'stdin', real)
    }
    expect(stdout).toContain('sk-…1234')
    expect(stdout).not.toContain('sk-ant-api03-FAKE-CLI-KEY-1234')
    stdout = ''
    expect(await main(['keys', 'list'])).toBe(0)
    expect(stdout).toMatch(/anthropic\s+set/)
  })

  it('rejects an unknown provider for keys', async () => {
    expect(await main(['keys', 'set', 'nope'])).toBe(2)
  })

  it('runs a task headless and prints the stamped report', async () => {
    new KeyStore().set('anthropic', 'sk-ant-test-000000')
    setChatModelFactoryForTests(() => new ScriptedChatModel(standardScript({ plan: PLAN })))
    expect(await main(['run', 'Assess my baseline'])).toBe(0)
    expect(stdout).toContain('# Themis report')
    expect(stdout).toMatch(/Themis \d+\.\d+\.\d+ · Aegis /)
  })

  it('exits 3 when a headless run needs a human decision', async () => {
    new KeyStore().set('anthropic', 'sk-ant-test-000000')
    setConfigValue('mcpServers', JSON.stringify([{ id: 'fake', transport: 'http', url: 'https://mcp.example/fake', allowedSkills: ['*'], allowWrite: true }]))
    setChatModelFactoryForTests(() => new ScriptedChatModel(standardScript({
      plan: PLAN, toolCall: { when: /Check controls/, name: 'themis__fake__create_ticket', args: { title: 'x' } },
    })))
    expect(await main(['run', 'Assess my baseline'])).toBe(3)
    expect(stderr).toContain('waiting for a human decision')
  })

  it('validates the dashboard port range', async () => {
    expect(await main(['dashboard', '--port', '80'])).toBe(2)
  })

  it('explains how to configure a provider when none exists', async () => {
    expect(await main(['run', 'x'])).toBe(1)
    expect(stderr).toContain('No AI provider is configured')
  })
})
