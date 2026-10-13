import fs from 'node:fs'
import path from 'node:path'
import { aegisRoot } from '../versions'
import { loadConfig } from '../config/config'

/** Reads the bundled pack using only the contracts §5 format (skill.json phases). */
export interface PhaseRef { id: string; file?: string; auto?: boolean; tokens?: number }
export interface SkillManifest { name?: string; osk?: string; version?: string; description?: string; phases?: PhaseRef[] }
export interface SkillInfo { name: string; description: string; phases: number; enabled: boolean; intelAsOf: string | null }

const NAME_RE = /^[a-z0-9][a-z0-9-]{0,63}$/
const skillsDir = (): string => path.join(aegisRoot(), 'skills')
const skillDir = (name: string): string => path.join(skillsDir(), name)

export function listSkillNames(): string[] {
  let entries: fs.Dirent[]
  try { entries = fs.readdirSync(skillsDir(), { withFileTypes: true }) } catch { return [] }
  return entries
    .filter((e) => e.isDirectory() && NAME_RE.test(e.name) && fs.existsSync(path.join(skillsDir(), e.name, 'skill.json')))
    .map((e) => e.name)
    .sort()
}

export function getSkillManifest(name: string): SkillManifest | null {
  if (!NAME_RE.test(name)) return null
  try { return JSON.parse(fs.readFileSync(path.join(skillDir(name), 'skill.json'), 'utf8')) as SkillManifest } catch { return null }
}

export function authoredPhaseIds(name: string): string[] {
  return (getSkillManifest(name)?.phases ?? []).filter((p) => !p.auto && typeof p.id === 'string').map((p) => p.id)
}

export function getPhaseContent(name: string, phaseId: string): string | null {
  if (!NAME_RE.test(phaseId)) return null
  const phase = getSkillManifest(name)?.phases?.find((p) => p.id === phaseId)
  if (!phase) return null
  const base = path.resolve(skillDir(name))
  const abs = path.resolve(base, phase.file ?? `references/${phase.id}.md`)
  if (!abs.startsWith(base + path.sep)) return null
  try { return fs.readFileSync(abs, 'utf8') } catch { return null }
}

export function intelAsOf(name: string): string | null {
  if (!NAME_RE.test(name)) return null
  try {
    const s = JSON.parse(fs.readFileSync(path.join(skillDir(name), 'intel-state.json'), 'utf8')) as Record<string, unknown>
    if (typeof s['last-intel-sync'] === 'string') return s['last-intel-sync']
  } catch { /* fall through to the generated intel file */ }
  try {
    const md = fs.readFileSync(path.join(skillDir(name), 'references', 'live-threat-intel.md'), 'utf8')
    return /\bon (\d{4}-\d{2}-\d{2})\b/.exec(md)?.[1] ?? null
  } catch { return null }
}

export function isSkillEnabled(name: string): boolean {
  return !loadConfig().skills.disabled.includes(name)
}

export function enabledSkillSlugs(): string[] {
  const disabled = loadConfig().skills.disabled
  return listSkillNames().filter((n) => !disabled.includes(n))
}

export function listSkillInfo(): SkillInfo[] {
  const disabled = loadConfig().skills.disabled
  return listSkillNames().map((name) => ({
    name,
    description: String(getSkillManifest(name)?.description ?? '').trim().slice(0, 300),
    phases: authoredPhaseIds(name).length,
    enabled: !disabled.includes(name),
    intelAsOf: intelAsOf(name),
  }))
}
