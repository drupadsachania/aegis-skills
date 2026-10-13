import { redactDeep } from '../src/redact'

it('redacts secret patterns in nested strings', () => {
  const out = redactDeep({ a: ['key AKIAIOSFODNN7EXAMPLE'], b: { c: 'mail bob@example.com' } })
  expect(JSON.stringify(out)).not.toMatch(/AKIA|bob@/)
})
it('redacts values under sensitive keys', () => {
  expect(redactDeep({ password: 'hunter2', apiKey: 'x', note: 'ok' })).toEqual({ password: '[REDACTED]', apiKey: '[REDACTED]', note: 'ok' })
})
it('produces JSON-safe output', () => {
  const out = redactDeep({ d: new Date('2026-10-07T00:00:00.000Z'), n: 10n, u: undefined, f: () => 1 }) as Record<string, unknown>
  expect(out).toEqual({ d: '2026-10-07T00:00:00.000Z', n: '10', f: null })
  expect(() => JSON.stringify(out)).not.toThrow()
})
it('caps recursion depth', () => {
  let deep: Record<string, unknown> = {}
  const root = deep
  for (let i = 0; i < 30; i++) { deep.x = {}; deep = deep.x as Record<string, unknown> }
  expect(JSON.stringify(redactDeep(root))).toContain('[TRUNCATED]')
})
