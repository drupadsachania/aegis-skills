import fs from 'node:fs'
import path from 'node:path'
import { versionStamp, isOskSupported, oskMajor, SUPPORTED_OSK_MAJOR } from '../src/version'

const repoRoot = path.resolve(__dirname, '..', '..', '..')
const aegisPkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'packages', 'aegis', 'package.json'), 'utf8'))
const corePkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'))

it('stamps the core, Aegis and osk versions from the installed pack', () => {
  const v = versionStamp({ aegisPackage: aegisPkg.name })
  expect(v).toEqual({ themis: corePkg.version, aegis: aegisPkg.version, osk: expect.stringMatching(/^\d+\.\d+$/) })
  expect(isOskSupported(v.osk)).toBe(true)
})
it('uses an explicit Themis version when given (plugin / app pass their own)', () => {
  expect(versionStamp({ themisVersion: '9.9.9', aegisPackage: aegisPkg.name }).themis).toBe('9.9.9')
})
it('degrades to unknown when Aegis is not installed', () => {
  expect(versionStamp({ aegisPackage: 'definitely-not-installed-aegis-xyz' })).toMatchObject({ aegis: 'unknown', osk: 'unknown' })
})
it('compares osk majors', () => {
  expect(SUPPORTED_OSK_MAJOR).toBe(1)
  expect(oskMajor('1.1')).toBe(1)
  expect(oskMajor('2')).toBe(2)
  expect(oskMajor('unknown')).toBeNull()
  expect(isOskSupported('2.0')).toBe(false)
})
