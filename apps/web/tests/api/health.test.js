'use strict'

const { createMocks } = require('node-mocks-http')
const handler = require('../../pages/api/health')

describe('GET /api/health', () => {
  test('exports a default function (Next.js production builds require it)', () => {
    expect(typeof handler).toBe('function')
    expect(handler.default).toBe(handler)
  })

  test('returns the skill health data from the skill pack', async () => {
    const { req, res } = createMocks({ method: 'GET' })
    await handler(req, res)
    expect(res._getStatusCode()).toBe(200)
    expect(Object.keys(res._getJSONData().skills)).toHaveLength(24)
  })
})
