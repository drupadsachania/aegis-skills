import { MAX, WINDOW_MS, clientIp, isExempt, rateLimited, resetRateLimit } from '../lib/rate-limit'

describe('rate limiter', () => {
  beforeEach(() => resetRateLimit())

  test('Anthropic outbound range 160.79.104.0/21 is exempt, neighbours are not', () => {
    expect(isExempt('160.79.104.5')).toBe(true)
    expect(isExempt('160.79.111.255')).toBe(true)
    expect(isExempt('160.79.112.0')).toBe(false)
    expect(isExempt('160.79.103.255')).toBe(false)
    expect(isExempt('8.8.8.8')).toBe(false)
    expect(isExempt('::ffff:160.79.104.9')).toBe(true)
    expect(isExempt('2607:6bc0::1')).toBe(false)
    expect(isExempt('not-an-ip')).toBe(false)
  })

  test('limits only after MAX non-exempt calls in the window', () => {
    const t = 1_000_000
    for (let i = 0; i < MAX; i++) expect(rateLimited('203.0.113.7', t)).toBe(false)
    expect(rateLimited('203.0.113.7', t)).toBe(true)
    expect(rateLimited('203.0.113.8', t)).toBe(false)
  })

  test('the window resets', () => {
    const t = 5_000_000
    for (let i = 0; i <= MAX; i++) rateLimited('203.0.113.9', t)
    expect(rateLimited('203.0.113.9', t)).toBe(true)
    expect(rateLimited('203.0.113.9', t + WINDOW_MS + 1)).toBe(false)
  })

  test('exempt addresses are never limited', () => {
    for (let i = 0; i < MAX * 3; i++) expect(rateLimited('160.79.104.20')).toBe(false)
  })

  test('clientIp takes the first hop and falls back to unknown', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }))).toBe('1.2.3.4')
    expect(clientIp(new Headers())).toBe('unknown')
  })
})
