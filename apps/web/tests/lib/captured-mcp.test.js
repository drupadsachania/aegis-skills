'use strict'

const fs = require('fs')
const path = require('path')
const { captureAegisMcp, trimGetSkill, EXAMPLE_SKILL } = require('../../lib/captured-mcp')
const { sampleStamp, stampLine } = require('../../lib/version-stamp-sample')
const { REPO_ROOT, SKILLS_DIR } = require('../../lib/site-paths')

describe('captured MCP output', () => {
  test('is the real server output, with the skill count of the pack on disk', async () => {
    const cap = await captureAegisMcp()
    const onDisk = fs.readdirSync(SKILLS_DIR).filter(n => fs.existsSync(path.join(SKILLS_DIR, n, 'SKILL.md'))).length
    expect(cap.skillCount).toBe(onDisk)
    const list = JSON.parse(cap.list.text)
    expect(list.skills.map(s => s.name)).toContain(EXAMPLE_SKILL)
    const get = JSON.parse(cap.get.text)
    expect(get.name).toBe(EXAMPLE_SKILL)
    expect(get.phases.length).toBeGreaterThan(0)
  })

  test('trimming only removes the long fields and says which', () => {
    const t = trimGetSkill(JSON.stringify({ name: 'x', version: '1', family: 'f', description: 'long', frameworks: [], tags: ['a'], context: {}, phases: [] }))
    expect(JSON.parse(t.text)).toEqual({ name: 'x', version: '1', family: 'f', frameworks: [], phases: [] })
    expect(t.omitted).toEqual(['description', 'tags', 'context'])
  })
})

describe('version stamp sample', () => {
  test('reads the same inputs as versionStamp()', () => {
    const s = sampleStamp()
    expect(s.aegis).toBe(JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'packages', 'aegis', 'package.json'), 'utf8')).version)
    expect(s.themis).toBe(JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'packages', 'themis-core', 'package.json'), 'utf8')).version)
    expect(s.osk).toMatch(/^\d+\.\d+$/)
    expect(stampLine(s)).toBe(`Themis ${s.themis} · Aegis ${s.aegis} (osk ${s.osk})`)
  })

  test('equals the real versionStamp() when themis-core is built', () => {
    const dist = path.join(REPO_ROOT, 'packages', 'themis-core', 'dist', 'index.js')
    if (!fs.existsSync(dist)) return // dist is a build output; the check runs wherever the packages are built
    // eslint-disable-next-line global-require
    const real = require(dist).versionStamp()
    expect(sampleStamp()).toEqual(real)
  })
})
