import fs from 'node:fs'
import path from 'node:path'
import { versionStamp, type VersionStamp } from '@aegis-skills/themis-core'

/** The bundled skill pack (contracts §3; see plan precondition P11). */
export const AEGIS_PACKAGE = 'aegis-skills'

let rootOverride: string | null = null
/** Tests only: point the skill reader at a fixture pack. Pass null to restore. */
export function setAegisRootForTests(dir: string | null): void { rootOverride = dir }

/** Directory of the installed Aegis package. Works even if its `exports` hide package.json. */
export function aegisRoot(): string {
  if (rootOverride) return rootOverride
  for (const base of require.resolve.paths(AEGIS_PACKAGE) ?? []) {
    const pj = path.join(base, AEGIS_PACKAGE, 'package.json')
    if (fs.existsSync(pj)) return path.dirname(fs.realpathSync(pj))
  }
  throw new Error(`Cannot locate the ${AEGIS_PACKAGE} package. Reinstall @aegis-skills/themis.`)
}

/** src/versions.ts and dist/versions.js both sit one level below the package root. */
export function ownVersion(): string {
  return String(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')).version)
}

/** Every RunState and report carries this stamp (contracts §6). */
export function readVersions(): VersionStamp {
  return versionStamp({ themisVersion: ownVersion(), aegisPackage: AEGIS_PACKAGE, resolveFrom: __dirname })
}
