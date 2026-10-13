import fs from 'node:fs'
import path from 'node:path'
import { useTempHome } from '../helpers/fixtures'
import { parseEnv, serializeEnv } from '../../src/config/env-file'
import { KeyStore, mask, KeyError } from '../../src/config/keys'

const SECRET = 'sk-ant-api03-THIS-IS-A-FAKE-KEY-1234567890abcd'

describe('env-file', () => {
  it('parses KEY=VALUE, quotes and comments; drops invalid lines', () => {
    const m = parseEnv('# c\nA_KEY=abc\nB_KEY="def"\nlower=x\nC_KEY=has space\n=bad\n')
    expect([...m.entries()]).toEqual([['A_KEY', 'abc'], ['B_KEY', 'def']])
  })
  it('serialises sorted with a header', () => {
    const s = serializeEnv(new Map([['Z_KEY', '1'], ['A_KEY', '2']]))
    expect(s).toMatch(/^# Managed by themis/)
    expect(s.indexOf('A_KEY=2')).toBeLessThan(s.indexOf('Z_KEY=1'))
  })
})

describe('KeyStore', () => {
  const home = useTempHome()
  const file = () => path.join(home.dir(), '.env')

  it('masks keys and never exposes the full value in status', () => {
    const ks = new KeyStore(file(), {})
    const st = ks.set('anthropic', SECRET)
    expect(st).toEqual({ provider: 'anthropic', envVar: 'ANTHROPIC_API_KEY', status: 'set', source: 'file', masked: mask(SECRET) })
    expect(JSON.stringify(st)).not.toContain(SECRET)
    expect(mask(SECRET)).toBe('sk-…abcd')
    expect(mask('short')).toBe('••••')
  })
  it('environment variables take precedence over the file', () => {
    new KeyStore(file(), {}).set('openai', 'sk-file-0000000000')
    const ks = new KeyStore(file(), { OPENAI_API_KEY: 'sk-env-1111111111' })
    expect(ks.get('openai')).toBe('sk-env-1111111111')
    expect(ks.status('openai').source).toBe('env')
  })
  it('reports missing for cloud providers and optional for local', () => {
    const ks = new KeyStore(file(), {})
    expect(ks.status('google').status).toBe('missing')
    expect(ks.status('local').status).toBe('optional')
  })
  it('unset removes only that key', () => {
    const ks = new KeyStore(file(), {})
    ks.set('anthropic', SECRET); ks.set('google', 'AIza-fake-123456789')
    ks.unset('anthropic')
    expect(ks.get('anthropic')).toBeUndefined()
    expect(ks.get('google')).toBe('AIza-fake-123456789')
  })
  it('rejects values with whitespace or newlines (no .env injection)', () => {
    const ks = new KeyStore(file(), {})
    expect(() => ks.set('anthropic', 'abc\nEVIL=1')).toThrow(KeyError)
    expect(() => ks.set('anthropic', 'has space')).toThrow(KeyError)
  })
  const itPosix = process.platform === 'win32' ? it.skip : it
  itPosix('writes .env with mode 0600', () => {
    new KeyStore(file(), {}).set('anthropic', SECRET)
    expect(fs.statSync(file()).mode & 0o777).toBe(0o600)
  })
})
