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
const { logInvocation } = require('../../lib/telemetry')
const httpMocks = require('node-mocks-http')
const handler = require('../../pages/api/[skill]/phase/[phaseId]')

const MOCK_MANIFEST = { name: 'deception-engineering', phases: [{ id: 'signal-writing-guide' }] }

describe('GET /api/[skill]/phase/[phaseId]', () => {
  beforeEach(() => jest.clearAllMocks())

  test('returns 200 with markdown content-type', async () => {
    getSkillManifest.mockResolvedValue(MOCK_MANIFEST)
    getPhaseContent.mockResolvedValue('# Signal Writing Guide\n\nContent.')
    const req = httpMocks.createRequest({
      method: 'GET',
      query: { skill: 'deception-engineering', phaseId: 'signal-writing-guide' }
    })
    const res = httpMocks.createResponse()
    await handler(req, res)
    expect(res.statusCode).toBe(200)
    expect(res.getHeader('Content-Type')).toContain('text/markdown')
    expect(res._getData()).toContain('Signal Writing Guide')
  })

  test('calls logInvocation', async () => {
    getSkillManifest.mockResolvedValue(MOCK_MANIFEST)
    getPhaseContent.mockResolvedValue('content')
    const req = httpMocks.createRequest({
      method: 'GET',
      query: { skill: 'deception-engineering', phaseId: 'signal-writing-guide' }
    })
    const res = httpMocks.createResponse()
    await handler(req, res)
    expect(logInvocation).toHaveBeenCalledWith({
      skill: 'deception-engineering',
      phase: 'signal-writing-guide',
      platform: 'unknown'
    })
  })

  test('returns 404 for unknown skill', async () => {
    getSkillManifest.mockResolvedValue(null)
    const req = httpMocks.createRequest({
      method: 'GET',
      query: { skill: 'nonexistent', phaseId: 'p1' }
    })
    const res = httpMocks.createResponse()
    await handler(req, res)
    expect(res.statusCode).toBe(404)
    expect(JSON.parse(res._getData()).error).toBe('skill not found')
  })

  test('returns 404 for unknown phase', async () => {
    getSkillManifest.mockResolvedValue(MOCK_MANIFEST)
    getPhaseContent.mockResolvedValue(null)
    const req = httpMocks.createRequest({
      method: 'GET',
      query: { skill: 'deception-engineering', phaseId: 'bad-phase' }
    })
    const res = httpMocks.createResponse()
    await handler(req, res)
    expect(res.statusCode).toBe(404)
    expect(JSON.parse(res._getData()).error).toBe('phase not found')
  })

  test('returns 405 for non-GET requests', async () => {
    const req = httpMocks.createRequest({
      method: 'POST',
      query: { skill: 'deception-engineering', phaseId: 'signal-writing-guide' }
    })
    const res = httpMocks.createResponse()
    await handler(req, res)
    expect(res.statusCode).toBe(405)
  })

  test('sets CORS header', async () => {
    getSkillManifest.mockResolvedValue(MOCK_MANIFEST)
    getPhaseContent.mockResolvedValue('content')
    const req = httpMocks.createRequest({
      method: 'GET',
      query: { skill: 'deception-engineering', phaseId: 'signal-writing-guide' }
    })
    const res = httpMocks.createResponse()
    await handler(req, res)
    expect(res.getHeader('Access-Control-Allow-Origin')).toBe('*')
  })
})
