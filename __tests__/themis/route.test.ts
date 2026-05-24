import { NextRequest } from 'next/server'
import { ValidationError, ProviderUnavailableError, OrchestrateResponse } from '@/lib/themis/types'

// Mock orchestrate
jest.mock('@/lib/themis/index', () => ({
  orchestrate: jest.fn(),
}))

// Mock availableProviders
jest.mock('@/lib/themis/provider', () => ({
  availableProviders: jest.fn(),
}))

// Mock sanitiseTask and validateContext so we can control their behaviour
jest.mock('@/lib/themis/sanitise', () => ({
  sanitiseTask: jest.fn((s: string) => {
    if (s.length > 4000) throw new (require('@/lib/themis/types').ValidationError)('Task exceeds maximum length of 4000 characters')
    return s
  }),
  validateContext: jest.fn(),
}))

// Mock Supabase — createClient is called via require() at runtime in the route
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}))

import { POST } from '@/app/api/themis/route'
import { orchestrate } from '@/lib/themis/index'
import { availableProviders } from '@/lib/themis/provider'
import { createClient } from '@supabase/supabase-js'

const mockOrchestrate = orchestrate as jest.MockedFunction<typeof orchestrate>
const mockAvailableProviders = availableProviders as jest.MockedFunction<typeof availableProviders>
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

function makeRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/themis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

const VALID_ORCHESTRATE_RESPONSE: OrchestrateResponse = {
  report: 'Security analysis complete.',
  subTaskResults: [],
  guardrailSummary: { passed: 1, flagged: 0, blocked: 0 },
  skillTrace: ['auth-bypass'],
  totalInputTokens: 100,
  totalOutputTokens: 200,
  durationMs: 1500,
  threadId: 'mock-thread-id',
}

// Helper to build a Supabase mock that does NOT trigger rate limiting
function makeUnlimitedSupabaseMock() {
  return {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      insert: jest.fn().mockResolvedValue({ error: null }),
      upsert: jest.fn().mockResolvedValue({ error: null }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    }),
  }
}

// Helper to build a Supabase mock that DOES trigger rate limiting
// count: 10 within the window → limited: true
function makeLimitedSupabaseMock() {
  const windowStart = new Date(Date.now() - 10000).toISOString() // 10 seconds ago, within 60s window
  return {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { count: 10, window_start: windowStart },
            error: null,
          }),
        }),
      }),
      insert: jest.fn().mockResolvedValue({ error: null }),
      upsert: jest.fn().mockResolvedValue({ error: null }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    }),
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  // Default: one provider available, orchestrate succeeds
  mockAvailableProviders.mockReturnValue(['anthropic'])
  mockOrchestrate.mockResolvedValue(VALID_ORCHESTRATE_RESPONSE)

  // Set env vars so Supabase client gets created
  process.env.SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_ANON_KEY = 'test-anon-key'

  // Default: Supabase returns no existing row (not rate limited)
  mockCreateClient.mockReturnValue(makeUnlimitedSupabaseMock() as unknown as ReturnType<typeof createClient>)
})

afterEach(() => {
  delete process.env.SUPABASE_URL
  delete process.env.SUPABASE_ANON_KEY
})

describe('POST /api/themis', () => {
  describe('security headers', () => {
    test('200 response includes X-Content-Type-Options: nosniff', async () => {
      const req = makeRequest({ task: 'Analyse the login endpoint' })
      const res = await POST(req)
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    })

    test('200 response includes X-Frame-Options: DENY', async () => {
      const req = makeRequest({ task: 'Analyse the login endpoint' })
      const res = await POST(req)
      expect(res.headers.get('X-Frame-Options')).toBe('DENY')
    })

    test('400 response includes X-Content-Type-Options: nosniff', async () => {
      const req = makeRequest({}) // missing task
      const res = await POST(req)
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    })

    test('400 response includes X-Frame-Options: DENY', async () => {
      const req = makeRequest({})
      const res = await POST(req)
      expect(res.headers.get('X-Frame-Options')).toBe('DENY')
    })

    test('503 response includes X-Content-Type-Options: nosniff', async () => {
      mockAvailableProviders.mockReturnValue([])
      const req = makeRequest({ task: 'Analyse' })
      const res = await POST(req)
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    })

    test('503 response includes X-Frame-Options: DENY', async () => {
      mockAvailableProviders.mockReturnValue([])
      const req = makeRequest({ task: 'Analyse' })
      const res = await POST(req)
      expect(res.headers.get('X-Frame-Options')).toBe('DENY')
    })

    test('429 response includes X-Content-Type-Options: nosniff', async () => {
      mockCreateClient.mockReturnValue(makeLimitedSupabaseMock() as unknown as ReturnType<typeof createClient>)
      const req = makeRequest({ task: 'Analyse' }, { 'x-forwarded-for': '1.2.3.4' })
      const res = await POST(req)
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    })

    test('429 response includes X-Frame-Options: DENY', async () => {
      mockCreateClient.mockReturnValue(makeLimitedSupabaseMock() as unknown as ReturnType<typeof createClient>)
      const req = makeRequest({ task: 'Analyse' }, { 'x-forwarded-for': '1.2.3.4' })
      const res = await POST(req)
      expect(res.headers.get('X-Frame-Options')).toBe('DENY')
    })

    test('500 response includes X-Content-Type-Options: nosniff', async () => {
      mockOrchestrate.mockRejectedValue(new Error('unexpected'))
      const req = makeRequest({ task: 'Analyse' })
      const res = await POST(req)
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    })

    test('500 response includes X-Frame-Options: DENY', async () => {
      mockOrchestrate.mockRejectedValue(new Error('unexpected'))
      const req = makeRequest({ task: 'Analyse' })
      const res = await POST(req)
      expect(res.headers.get('X-Frame-Options')).toBe('DENY')
    })
  })

  describe('validation', () => {
    test('missing task field → 400 { error: "Request invalid" }', async () => {
      const req = makeRequest({ context: {} })
      const res = await POST(req)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('Request invalid')
    })

    test('task > 4000 chars → 400 { error: "Request invalid" }', async () => {
      const req = makeRequest({ task: 'a'.repeat(4001) })
      const res = await POST(req)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('Request invalid')
    })

    test('task is not a string → 400 { error: "Request invalid" }', async () => {
      const req = makeRequest({ task: 12345 })
      const res = await POST(req)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('Request invalid')
    })

    test('invalid JSON body → 400 { error: "Request invalid" }', async () => {
      const req = new NextRequest('http://localhost/api/themis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json {{{',
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('Request invalid')
    })

    test('null body → 400 { error: "Request invalid" }', async () => {
      const req = makeRequest(null)
      const res = await POST(req)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('Request invalid')
    })
  })

  describe('provider availability', () => {
    test('no providers configured → 503 { error: "AI providers unavailable" }', async () => {
      mockAvailableProviders.mockReturnValue([])
      const req = makeRequest({ task: 'Analyse the login endpoint' })
      const res = await POST(req)
      expect(res.status).toBe(503)
      const body = await res.json()
      expect(body.error).toBe('AI providers unavailable')
    })
  })

  describe('rate limiting', () => {
    test('rate limit exceeded → 429 with Retry-After: 60 header', async () => {
      mockCreateClient.mockReturnValue(makeLimitedSupabaseMock() as unknown as ReturnType<typeof createClient>)
      const req = makeRequest({ task: 'Analyse' }, { 'x-forwarded-for': '1.2.3.4' })
      const res = await POST(req)
      expect(res.status).toBe(429)
      expect(res.headers.get('Retry-After')).toBe('60')
    })

    test('rate limit exceeded → response body has error field', async () => {
      mockCreateClient.mockReturnValue(makeLimitedSupabaseMock() as unknown as ReturnType<typeof createClient>)
      const req = makeRequest({ task: 'Analyse' }, { 'x-forwarded-for': '1.2.3.4' })
      const res = await POST(req)
      const body = await res.json()
      expect(body).toHaveProperty('error')
    })
  })

  describe('successful request', () => {
    test('valid request with mocked orchestrate → 200 with OrchestrateResponse shape', async () => {
      const req = makeRequest({ task: 'Analyse the login endpoint for vulnerabilities' })
      const res = await POST(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toHaveProperty('report')
      expect(body).toHaveProperty('subTaskResults')
      expect(body).toHaveProperty('guardrailSummary')
      expect(body).toHaveProperty('skillTrace')
      expect(body).toHaveProperty('totalInputTokens')
      expect(body).toHaveProperty('totalOutputTokens')
      expect(body).toHaveProperty('durationMs')
    })

    test('valid request returns the orchestrate result', async () => {
      const req = makeRequest({ task: 'Analyse login endpoint' })
      const res = await POST(req)
      const body = await res.json()
      expect(body.report).toBe('Security analysis complete.')
      expect(body.skillTrace).toEqual(['auth-bypass'])
    })
  })

  describe('error handling', () => {
    test('ProviderUnavailableError thrown by orchestrate → 503', async () => {
      mockOrchestrate.mockRejectedValue(new ProviderUnavailableError('No keys'))
      const req = makeRequest({ task: 'Analyse login' })
      const res = await POST(req)
      expect(res.status).toBe(503)
      const body = await res.json()
      expect(body.error).toBe('AI providers unavailable')
    })

    test('unexpected error thrown by orchestrate → 500 { error: "Orchestration failed" }', async () => {
      mockOrchestrate.mockRejectedValue(new Error('Unexpected database error'))
      const req = makeRequest({ task: 'Analyse login' })
      const res = await POST(req)
      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.error).toBe('Orchestration failed')
    })

    test('ValidationError thrown by orchestrate → 400', async () => {
      mockOrchestrate.mockRejectedValue(new ValidationError('Invalid input'))
      const req = makeRequest({ task: 'Analyse login' })
      const res = await POST(req)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('Request invalid')
    })
  })
})
