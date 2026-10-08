'use strict'

const path = require('path')
const { repoRoot, aegisDir, skillsDir, healthFile } = require('../lib/aegis-paths')

describe('aegis-paths', () => {
  const realCwd = process.cwd
  afterEach(() => {
    process.cwd = realCwd
    delete process.env.AEGIS_PACKAGE_DIR
  })

  test('resolves the repo root when cwd is apps/web', () => {
    process.cwd = () => path.join(path.sep, 'repo', 'apps', 'web')
    const root = path.resolve(path.sep, 'repo')
    expect(repoRoot()).toBe(root)
    expect(skillsDir()).toBe(path.join(root, 'packages', 'aegis', 'skills'))
  })

  test('treats any other cwd as the repo root', () => {
    process.cwd = () => path.join(path.sep, 'repo')
    expect(healthFile()).toBe(path.join(path.resolve(path.sep, 'repo'), 'packages', 'aegis', 'health.json'))
  })

  test('AEGIS_PACKAGE_DIR overrides discovery', () => {
    process.env.AEGIS_PACKAGE_DIR = path.join(path.sep, 'elsewhere', 'aegis')
    expect(aegisDir()).toBe(path.resolve(path.sep, 'elsewhere', 'aegis'))
  })

  test('finds the real skill pack from the test cwd', () => {
    expect(require('fs').existsSync(path.join(skillsDir(), 'mitre-attack', 'SKILL.md'))).toBe(true)
  })
})
