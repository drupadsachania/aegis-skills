'use strict'

const { listSkills } = require('../../lib/aegis')

test('the site facade serves no health score for any skill', async () => {
  const skills = await listSkills()
  expect(skills.length).toBe(24)
  for (const s of skills) {
    expect(Object.keys(s)).not.toContain('healthScore')
    expect(typeof s.name).toBe('string')
  }
})
