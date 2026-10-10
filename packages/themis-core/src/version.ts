// Report stamping (contracts §6): Themis version + installed Aegis version + osk.
// Aegis is resolved at runtime with require.resolve — core does not depend on it.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import type { VersionStamp } from './contracts'

export const SUPPORTED_OSK_MAJOR = 1
const UNKNOWN = 'unknown'

function readJson(file: string): Record<string, unknown> | null {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown> } catch { return null }
}

export function coreVersion(): string {
  const pkg = readJson(path.join(__dirname, '..', 'package.json'))   // works from src/ and dist/
  return typeof pkg?.version === 'string' ? pkg.version : UNKNOWN
}

export function findAegisRoot(packageName = 'aegis-skills', from: string = __dirname): string | null {
  const req = createRequire(path.join(from, 'noop.js'))
  try { return path.dirname(req.resolve(`${packageName}/package.json`)) } catch { /* "exports" may hide package.json */ }
  try {
    let dir = path.dirname(req.resolve(packageName))
    for (;;) {
      if (readJson(path.join(dir, 'package.json'))?.name === packageName) return dir
      const parent = path.dirname(dir)
      if (parent === dir) return null
      dir = parent
    }
  } catch {
    return null
  }
}

/** osk from the first skill.json found under <aegisRoot>/skills. */
export function readOsk(aegisRoot: string): string {
  let entries: string[]
  try { entries = fs.readdirSync(path.join(aegisRoot, 'skills')).sort() } catch { return UNKNOWN }
  for (const name of entries) {
    const osk = readJson(path.join(aegisRoot, 'skills', name, 'skill.json'))?.osk
    if (typeof osk === 'string') return osk
    if (typeof osk === 'number') return String(osk)
  }
  return UNKNOWN
}

export function oskMajor(osk: string): number | null {
  const m = /^(\d+)(\.|$)/.exec(osk)
  return m ? Number(m[1]) : null
}

export function isOskSupported(osk: string): boolean {
  return oskMajor(osk) === SUPPORTED_OSK_MAJOR
}

export function versionStamp(opts: { themisVersion?: string; aegisPackage?: string; resolveFrom?: string } = {}): VersionStamp {
  const root = findAegisRoot(opts.aegisPackage ?? 'aegis-skills', opts.resolveFrom ?? __dirname)
  const aegisPkg = root ? readJson(path.join(root, 'package.json')) : null
  return {
    themis: opts.themisVersion ?? coreVersion(),
    aegis: typeof aegisPkg?.version === 'string' ? aegisPkg.version : UNKNOWN,
    osk: root ? readOsk(root) : UNKNOWN,
  }
}
