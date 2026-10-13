import fs from 'node:fs'
import path from 'node:path'
import { readVersions, aegisRoot, AEGIS_PACKAGE } from '../src/versions'

describe('readVersions', () => {
  it('stamps this package, the bundled Aegis pack and its osk (core versionStamp)', () => {
    const own = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')).version
    const aegis = JSON.parse(fs.readFileSync(path.join(aegisRoot(), 'package.json'), 'utf8'))
    expect(aegis.name).toBe(AEGIS_PACKAGE)
    const v = readVersions()
    expect(v.themis).toBe(own)
    expect(v.aegis).toBe(aegis.version)
    expect(v.osk).toMatch(/^1\.\d+$/)
  })
})
