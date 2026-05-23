'use strict'

jest.mock('../../lib/skill-reader', () => ({
  getSkillManifest: jest.fn(),
  getPhaseContent: jest.fn()
}))

jest.mock('../../lib/telemetry', () => ({
  logInvocation: jest.fn(),
  detectPlatform: jest.fn().mockReturnValue('unknown')
}))

const { getSkillManifest, getPhaseContent } = require('../../lib/skill-reader')
const { logInvocation, detectPlatform } = require('../../lib/telemetry')
const httpMocks = require('node-mocks-http')
const handler = require('../../pages/api/[skill]/invoke')

const MOCK_MANIFEST = { name: 'deception-engineering', phases: [{ id: 'attack-surface-taxonomy' }] }

describe('POST /api/[skill]/invoke', () => {
  beforeEach(() => jest.clearAllMocks())

  test('returns 200 with phase content', async () => {
    getSkillManifest.mockResolvedValue(MOCK_MANIFEST)
    getPhaseContent.mockResolvedValue('# Attack Surface\n\nContent here.')
    const req = httpMocks.createRequest({
      method: 'POST',
      query: { skill: 'deception-engineering' },
      body: { phase: 'attack-surface-taxonomy' }
    })
    const res = httpMocks.createResponse()
    await handler(req, res)
    expect(res.statusCode).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data.phase).toBe('attack-surface-taxonomy')
    expect(data.content).toContain('Attack Surface')
  })

  test('calls logInvocation with skill, phase, platform', async () => {
    getSkillManifest.mockResolvedValue(MOCK_MANIFEST)
    getPhaseContent.mockResolvedValue('content')
    detectPlatform.mockReturnValue('openai')
    const req = httpMocks.createRequest({
      method: 'POST',
      query: { skill: 'deception-engineering' },
      body: { phase: 'attack-surface-taxonomy' },
      headers: { 'user-agent': 'OpenAI-Bot/1.0' }
    })
    const res = httpMocks.createResponse()
    await handler(req, res)
    expect(logInvocation).toHaveBeenCalledWith({
      skill: 'deception-engineering',
      phase: 'attack-surface-taxonomy',
      platform: 'openai'
    })
  })

  test('returns 400 when phase is missing from body', async () => {
    const req = httpMocks.createRequest({
      method: 'POST',
      query: { skill: 'deception-engineering' },
      body: {}
    })
    const res = httpMocks.createResponse()
    await handler(req, res)
    expect(res.statusCode).toBe(400)
    const data = JSON.parse(res._getData())
    expect(data.error).toBe('phase is required')
  })

  test('returns 404 for unknown skill', async () => {
    getSkillManifest.mockResolvedValue(null)
    const req = httpMocks.createRequest({
      method: 'POST',
      query: { skill: 'nonexistent' },
      body: { phase: 'p1' }
    })
    const res = httpMocks.createResponse()
    await handler(req, res)
    expect(res.statusCode).toBe(404)
    const data = JSON.parse(res._getData())
    expect(data.error).toMatch(/nonexistent/)
  })

  test('returns 404 for unknown phase', async () => {
    getSkillManifest.mockResolvedValue(MOCK_MANIFEST)
    getPhaseContent.mockResolvedValue(null)
    const req = httpMocks.createRequest({
      method: 'POST',
      query: { skill: 'deception-engineering' },
      body: { phase: 'nonexistent-phase' }
    })
    const res = httpMocks.createResponse()
    await handler(req, res)
    expect(res.statusCode).toBe(404)
    const data = JSON.parse(res._getData())
    expect(data.error).toMatch(/nonexistent-phase/)
  })

  test('returns 405 for non-POST requests', async () => {
    const req = httpMocks.createRequest({
      method: 'GET',
      query: { skill: 'deception-engineering' }
    })
    const res = httpMocks.createResponse()
    await handler(req, res)
    expect(res.statusCode).toBe(405)
  })

  test('sets CORS header', async () => {
    getSkillManifest.mockResolvedValue(MOCK_MANIFEST)
    getPhaseContent.mockResolvedValue('content')
    const req = httpMocks.createRequest({
      method: 'POST',
      query: { skill: 'deception-engineering' },
      body: { phase: 'attack-surface-taxonomy' }
    })
    const res = httpMocks.createResponse()
    await handler(req, res)
    expect(res.getHeader('Access-Control-Allow-Origin')).toBe('*')
  })
})
