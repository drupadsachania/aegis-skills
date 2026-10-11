'use strict'

const path = require('path')
const { loadFlattener } = require('../../lib/flat-prompt')
const { SKILLS_DIR } = require('../../lib/site-paths')

test('Phase 1 flattener returns the whole compliance skill as one markdown string', async () => {
  const text = await loadFlattener()(path.join(SKILLS_DIR, 'compliance'))
  expect(typeof text).toBe('string')
  expect(text.length).toBeGreaterThan(1000)
  expect(text).toMatch(/^#{1,3} /m)
})
