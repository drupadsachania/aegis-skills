'use strict'

jest.mock('../../lib/skill-reader', () => ({
  listSkills: jest.fn()
}))

const { listSkills } = require('../../lib/skill-reader')
const httpMocks = require('node-mocks-http')
const handler = require('../../pages/api/skills')

describe('GET /api/skills', () => {
  beforeEach(() => jest.clearAllMocks())

  test('returns 200 with skills array', async () => {
    listSkills.mockResolvedValue([
      { name: 'deception-engineering', version: '2.0.0', description: 'Test.' }
    ])
    const req = httpMocks.createRequest({ method: 'GET' })
    const res = httpMocks.createResponse()
    await handler(req, res)
    expect(res.statusCode).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data.skills).toHaveLength(1)
    expect(data.skills[0].name).toBe('deception-engineering')
  })

  test('returns empty skills array when no skills exist', async () => {
    listSkills.mockResolvedValue([])
    const req = httpMocks.createRequest({ method: 'GET' })
    const res = httpMocks.createResponse()
    await handler(req, res)
    expect(res.statusCode).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data.skills).toEqual([])
  })

  test('returns 405 for non-GET requests', async () => {
    const req = httpMocks.createRequest({ method: 'POST' })
    const res = httpMocks.createResponse()
    await handler(req, res)
    expect(res.statusCode).toBe(405)
  })

  test('sets CORS header', async () => {
    listSkills.mockResolvedValue([])
    const req = httpMocks.createRequest({ method: 'GET' })
    const res = httpMocks.createResponse()
    await handler(req, res)
    expect(res.getHeader('Access-Control-Allow-Origin')).toBe('*')
  })

  test('returns 204 for OPTIONS preflight', async () => {
    const req = httpMocks.createRequest({ method: 'OPTIONS' })
    const res = httpMocks.createResponse()
    await handler(req, res)
    expect(res.statusCode).toBe(204)
  })
})
