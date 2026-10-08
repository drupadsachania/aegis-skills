'use strict'

jest.mock('aegis-skills/mcp/skill-reader', () => ({
  listSkills: jest.fn().mockResolvedValue([{ name: 'zz-not-in-health-json', context: { environments: ['cloud'] } }]),
  getSkillManifest: jest.fn(),
  getPhaseContent: jest.fn(),
  getPhaseRef: jest.fn()
}))

const adapter = require('../lib/skill-reader')
const aegis = require('aegis-skills/mcp/skill-reader')

test('passes reader functions through unchanged', () => {
  expect(adapter.getSkillManifest).toBe(aegis.getSkillManifest)
  expect(adapter.getPhaseContent).toBe(aegis.getPhaseContent)
})

test('listSkills keeps context and adds a healthScore', async () => {
  const [row] = await adapter.listSkills()
  expect(row.context).toEqual({ environments: ['cloud'] })
  expect(row.healthScore).toBeNull()
})
