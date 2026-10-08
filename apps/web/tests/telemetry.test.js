'use strict'

const { detectPlatform } = require('../lib/telemetry')

describe('detectPlatform', () => {
  test('detects openai from User-Agent', () => {
    expect(detectPlatform('OpenAI-Bot/1.0')).toBe('openai')
  })

  test('detects anthropic from User-Agent containing Claude', () => {
    expect(detectPlatform('Claude/3.0')).toBe('anthropic')
  })

  test('detects anthropic from User-Agent containing Anthropic', () => {
    expect(detectPlatform('Anthropic-AI/1.0')).toBe('anthropic')
  })

  test('detects cursor from User-Agent (case-insensitive)', () => {
    expect(detectPlatform('Cursor/0.42.0')).toBe('cursor')
    expect(detectPlatform('cursor-client')).toBe('cursor')
  })

  test('returns unknown for unrecognised User-Agent', () => {
    expect(detectPlatform('Mozilla/5.0')).toBe('unknown')
  })

  test('returns unknown for empty string', () => {
    expect(detectPlatform('')).toBe('unknown')
  })

  test('returns unknown when called with no argument', () => {
    expect(detectPlatform()).toBe('unknown')
  })
})

describe('logInvocation', () => {
  test('resolves without throwing when env vars are not set', async () => {
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_ANON_KEY
    jest.resetModules()
    const { logInvocation } = require('../lib/telemetry')
    await expect(
      logInvocation({ skill: 'test-skill', phase: 'phase-one', platform: 'unknown' })
    ).resolves.toBeUndefined()
  })
})
