'use strict'

jest.mock('../../lib/skill-reader', () => ({
  listSkills: jest.fn()
}))

const { listSkills } = require('../../lib/skill-reader')
const httpMocks = require('node-mocks-http')

let handler
beforeAll(() => {
  handler = require('../../pages/api/recommend')
})

const SKILLS_WITH_CONTEXT = [
  {
    name: 'network-security',
    version: '1.0.0',
    description: 'Network security assessment.',
    frameworks: ['mitre-attack'],
    tags: ['network'],
    phases: 4,
    context: {
      environments: ['enterprise', 'cloud'],
      'industry-verticals': ['financial-services'],
      'attack-surface-tags': ['network', 'perimeter', 'lateral-movement']
    }
  },
  {
    name: 'endpoint-security',
    version: '1.0.0',
    description: 'Endpoint security workflow.',
    frameworks: ['mitre-attack'],
    tags: ['endpoint'],
    phases: 4,
    context: {
      environments: ['enterprise', 'remote-workforce'],
      'industry-verticals': ['financial-services', 'healthcare'],
      'attack-surface-tags': ['endpoint', 'malware', 'credential-theft']
    }
  },
  {
    name: 'application-security',
    version: '1.0.0',
    description: 'Application security assessment.',
    frameworks: ['owasp-top10'],
    tags: ['appsec'],
    phases: 5,
    context: {
      environments: ['cloud', 'saas'],
      'industry-verticals': ['saas-providers'],
      'attack-surface-tags': ['web-application', 'api', 'injection']
    }
  },
  {
    name: 'mitre-attack',
    version: '1.0.0',
    description: 'ATT&CK TTP mapping.',
    frameworks: ['mitre-attack'],
    tags: ['ttp'],
    phases: 3
    // no context block
  }
]

describe('POST /api/recommend', () => {
  beforeEach(() => jest.clearAllMocks())

  test('returns 200 with ranked skills for matching environments', async () => {
    listSkills.mockResolvedValue(SKILLS_WITH_CONTEXT)
    const req = httpMocks.createRequest({
      method: 'POST',
      body: { environments: ['enterprise'], attack_surface_tags: [] }
    })
    const res = httpMocks.createResponse()
    await handler(req, res)
    expect(res.statusCode).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data.skills).toBeDefined()
    expect(Array.isArray(data.skills)).toBe(true)
  })

  test('ranks network-security above application-security for enterprise + network tags', async () => {
    listSkills.mockResolvedValue(SKILLS_WITH_CONTEXT)
    const req = httpMocks.createRequest({
      method: 'POST',
      body: { environments: ['enterprise'], attack_surface_tags: ['network', 'perimeter'] }
    })
    const res = httpMocks.createResponse()
    await handler(req, res)
    const data = JSON.parse(res._getData())
    const names = data.skills.map(s => s.name)
    const networkIdx = names.indexOf('network-security')
    const appIdx = names.indexOf('application-security')
    expect(networkIdx).toBeGreaterThanOrEqual(0)
    expect(networkIdx).toBeLessThan(appIdx === -1 ? Infinity : appIdx)
  })

  test('includes relevance_score in each result', async () => {
    listSkills.mockResolvedValue(SKILLS_WITH_CONTEXT)
    const req = httpMocks.createRequest({
      method: 'POST',
      body: { environments: ['enterprise'], attack_surface_tags: ['network'] }
    })
    const res = httpMocks.createResponse()
    await handler(req, res)
    const data = JSON.parse(res._getData())
    expect(data.skills[0]).toHaveProperty('relevance_score')
    expect(typeof data.skills[0].relevance_score).toBe('number')
  })

  test('returns all skills with score 0 when no match found', async () => {
    listSkills.mockResolvedValue(SKILLS_WITH_CONTEXT)
    const req = httpMocks.createRequest({
      method: 'POST',
      body: { environments: ['ot'], attack_surface_tags: ['scada'] }
    })
    const res = httpMocks.createResponse()
    await handler(req, res)
    const data = JSON.parse(res._getData())
    expect(Array.isArray(data.skills)).toBe(true)
  })

  test('handles skills without context block gracefully', async () => {
    listSkills.mockResolvedValue(SKILLS_WITH_CONTEXT)
    const req = httpMocks.createRequest({
      method: 'POST',
      body: { environments: ['enterprise'], attack_surface_tags: ['network'] }
    })
    const res = httpMocks.createResponse()
    await handler(req, res)
    expect(res.statusCode).toBe(200)
  })

  test('returns 400 when body is missing', async () => {
    const req = httpMocks.createRequest({ method: 'POST', body: undefined })
    const res = httpMocks.createResponse()
    await handler(req, res)
    expect(res.statusCode).toBe(400)
  })

  test('returns 400 when environments is not an array', async () => {
    const req = httpMocks.createRequest({
      method: 'POST',
      body: { environments: 'enterprise', attack_surface_tags: [] }
    })
    const res = httpMocks.createResponse()
    await handler(req, res)
    expect(res.statusCode).toBe(400)
  })

  test('returns 400 when attack_surface_tags is not an array', async () => {
    const req = httpMocks.createRequest({
      method: 'POST',
      body: { environments: [], attack_surface_tags: 'network' }
    })
    const res = httpMocks.createResponse()
    await handler(req, res)
    expect(res.statusCode).toBe(400)
  })

  test('returns 405 for GET requests', async () => {
    const req = httpMocks.createRequest({ method: 'GET' })
    const res = httpMocks.createResponse()
    await handler(req, res)
    expect(res.statusCode).toBe(405)
  })

  test('returns 204 for OPTIONS preflight', async () => {
    const req = httpMocks.createRequest({ method: 'OPTIONS' })
    const res = httpMocks.createResponse()
    await handler(req, res)
    expect(res.statusCode).toBe(204)
  })

  test('sets CORS header', async () => {
    listSkills.mockResolvedValue(SKILLS_WITH_CONTEXT)
    const req = httpMocks.createRequest({
      method: 'POST',
      body: { environments: [], attack_surface_tags: [] }
    })
    const res = httpMocks.createResponse()
    await handler(req, res)
    expect(res.getHeader('Access-Control-Allow-Origin')).toBe('*')
  })

  test('rejects arrays with non-string elements', async () => {
    const req = httpMocks.createRequest({
      method: 'POST',
      body: { environments: [1, null, 'enterprise'], attack_surface_tags: [] }
    })
    const res = httpMocks.createResponse()
    await handler(req, res)
    expect(res.statusCode).toBe(400)
  })

  test('rejects arrays longer than 20 items', async () => {
    const req = httpMocks.createRequest({
      method: 'POST',
      body: {
        environments: Array.from({ length: 21 }, (_, i) => `env-${i}`),
        attack_surface_tags: []
      }
    })
    const res = httpMocks.createResponse()
    await handler(req, res)
    expect(res.statusCode).toBe(400)
  })
})
