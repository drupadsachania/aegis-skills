import fs from 'node:fs'
import path from 'node:path'
import { openStore, versionStamp, findAegisRoot, type ThemisStore, type VersionStamp } from '@aegis-skills/themis-core'
import { createGateway, type Gateway } from '@aegis-skills/themis-gateway'

export interface PluginDeps {
  store: ThemisStore
  versions: VersionStamp
  /** Valid Aegis skill slugs (the decompose step may only use these). */
  skillSlugs: () => string[]
  gatewayFor: (skill: string, runId: string) => Gateway
  close: () => void
}

function discoverSkillSlugs(): string[] {
  const root = findAegisRoot()
  if (!root) return []
  try {
    return fs.readdirSync(path.join(root, 'skills'), { withFileTypes: true })
      .filter((e) => e.isDirectory() && fs.existsSync(path.join(root, 'skills', e.name, 'SKILL.md')))
      .map((e) => e.name)
      .sort()
  } catch {
    return []
  }
}

export function buildDeps(opts: { storePath?: string; skillSlugs?: string[] } = {}): PluginDeps {
  const store = openStore(opts.storePath) // default `${themisHome()}/themis.db`; ':memory:' in tests
  const versions = versionStamp()
  const gateways = new Map<string, Gateway>()
  let slugs: string[] | null = opts.skillSlugs ?? null
  return {
    store,
    versions,
    skillSlugs() {
      if (!slugs || slugs.length === 0) slugs = discoverSkillSlugs()
      return slugs
    },
    gatewayFor(skill, runId) {
      const key = `${runId}::${skill}`
      let g = gateways.get(key)
      if (!g) { g = createGateway({ skill, runId, store }); gateways.set(key, g) }
      return g // one per (run,skill), kept in memory so executeApproved runs on the proposing instance
    },
    close() {
      for (const g of gateways.values()) { void g.close().catch(() => undefined) }
      try { store.close() } catch { /* already closed */ }
    },
  }
}
