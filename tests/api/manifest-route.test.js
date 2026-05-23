'use strict'

jest.mock('../../lib/skill-reader', () => ({
  getSkillManifest: jest.fn()
}))

const { getSkillManifest } = require('../../lib/skill-reader')
const httpMocks = require('node-mocks-http')
const handler = require('../../pages/api/[skill]/manifest')

const MOCK_MANIFEST = {
  osk: '1.0',
  name: 'deception-engineering',
  version: '2.0.0',
  description: 'End-to-end deception engineering workflow.',
  phases: [{ id: 'attack-surface-taxonomy', lazy: true, tokens: 800, ref: 'references/attack-surface-taxonomy.md' }],
  endpoints: {
    mcp: 'mcp://skills.openskill.ai/deception-engineering',
    action: 'https://skills.openskill.ai/deception-engineering/invoke',
    artifacts: 'https://skills.openskill.ai/deception-engineering/download'
  }
}

describe('GET /api/[skill]/manifest', () => {
  beforeEach(() => jest.clearAllMocks())

  test('returns 200 with skill manifest', async () => {
    getSkillManifest.mockResolvedValue(MOCK_MANIFEST)
    const req = httpMocks.createRequest({ method: 'GET', query: { skill: 'deception-engineering' } })
    const res = httpMocks.createResponse()
    await handler(req, res)
    expect(res.statusCode).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data.name).toBe('deception-engineering')
    expect(data.osk).toBe('1.0')
  })

  test('returns 404 for unknown skill', async () => {
    getSkillManifest.mockResolvedValue(null)
    const req = httpMocks.createRequest({ method: 'GET', query: { skill: 'nonexistent' } })
    const res = httpMocks.createResponse()
    await handler(req, res)
    expect(res.statusCode).toBe(404)
    const data = JSON.parse(res._getData())
    expect(data.error).toMatch(/nonexistent/)
  })

  test('returns 405 for non-GET requests', async () => {
    const req = httpMocks.createRequest({ method: 'POST', query: { skill: 'deception-engineering' } })
    const res = httpMocks.createResponse()
    await handler(req, res)
    expect(res.statusCode).toBe(405)
  })

  test('sets CORS header', async () => {
    getSkillManifest.mockResolvedValue(MOCK_MANIFEST)
    const req = httpMocks.createRequest({ method: 'GET', query: { skill: 'deception-engineering' } })
    const res = httpMocks.createResponse()
    await handler(req, res)
    expect(res.getHeader('Access-Control-Allow-Origin')).toBe('*')
  })
})
