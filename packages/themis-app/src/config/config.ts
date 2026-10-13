import fs from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
import { themisHome, loadMcpServers } from '@aegis-skills/themis-core'

export const PROVIDER_IDS = ['anthropic', 'openai', 'google', 'local'] as const
const SKILL_NAME = /^[a-z0-9][a-z0-9-]{0,63}$/
const modelId = z.string().min(1).max(200)
const tierModels = z.object({ fast: modelId, standard: modelId, power: modelId }).partial().strict()

export const ConfigSchema = z.object({
  version: z.literal(1).default(1),
  defaultProvider: z.enum(PROVIDER_IDS).nullable().default(null),
  models: z.object({
    anthropic: tierModels.default({}),
    openai: tierModels.default({}),
    google: tierModels.default({}),
  }).strict().default({}),
  local: z.object({
    preset: z.enum(['ollama', 'lmstudio', 'custom']).default('ollama'),
    baseURL: z.string().url().refine((u) => /^https?:\/\//.test(u), 'must be an http(s) URL')
      .default('http://127.0.0.1:11434/v1'),
    model: z.string().max(200).default(''),
    toolCalling: z.enum(['unknown', 'supported', 'unsupported']).default('unknown'),
    toolCallingCheckedAt: z.string().nullable().default(null),
  }).strict().default({}),
  skills: z.object({ disabled: z.array(z.string().regex(SKILL_NAME)).max(200).default([]) }).strict().default({}),
  mcpServers: z.array(z.unknown()).max(32).default([]),
  limits: z.object({ maxConcurrentRuns: z.number().int().min(1).max(4).default(1) }).strict().default({}),
  dashboard: z.object({ port: z.number().int().min(1024).max(65535).default(9120) }).strict().default({}),
}).strict()

export type ThemisConfig = z.infer<typeof ConfigSchema>

export interface Paths { home: string; config: string; env: string; coreDb: string; appDb: string }

export function paths(): Paths {
  const home = themisHome()
  return {
    home,
    config: path.join(home, 'config.json'),
    env: path.join(home, '.env'),
    coreDb: path.join(home, 'themis.db'),
    appDb: path.join(home, 'app.db'),
  }
}

export function ensureHome(): Paths {
  const p = paths()
  fs.mkdirSync(p.home, { recursive: true, mode: 0o700 })
  return p
}

export class ConfigError extends Error {
  constructor(message: string) { super(message); this.name = 'ConfigError' }
}

function describeIssues(e: z.ZodError): string {
  return e.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ')
}

export function parseConfig(raw: unknown): ThemisConfig {
  const r = ConfigSchema.safeParse(raw ?? {})
  if (!r.success) throw new ConfigError(`Invalid config: ${describeIssues(r.error)}`)
  return r.data
}

/** Reads config.json on every call so the CLI and dashboard never drift. */
export function loadConfig(): ThemisConfig {
  const file = paths().config
  if (!fs.existsSync(file)) return parseConfig({})
  let raw: unknown
  try { raw = JSON.parse(fs.readFileSync(file, 'utf8')) } catch { throw new ConfigError(`${file} is not valid JSON`) }
  return parseConfig(raw)
}

/** Write via temp file + rename; 0600 on POSIX (Windows ignores modes — see docs). */
export function writeFileAtomic(file: string, data: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 })
  const tmp = `${file}.tmp-${process.pid}`
  fs.writeFileSync(tmp, data, { mode: 0o600 })
  fs.renameSync(tmp, file)
  if (process.platform !== 'win32') fs.chmodSync(file, 0o600)
}

export function saveConfig(cfg: ThemisConfig): ThemisConfig {
  const valid = parseConfig(cfg)
  writeFileAtomic(paths().config, JSON.stringify(valid, null, 2) + '\n')
  return valid
}

export function updateConfig(fn: (c: ThemisConfig) => ThemisConfig | void): ThemisConfig {
  const c = structuredClone(loadConfig())
  const r = fn(c)
  return saveConfig(r ?? c)
}

export function getConfigValue(cfg: ThemisConfig, dotted: string): unknown {
  let cur: unknown = cfg
  for (const k of dotted.split('.')) {
    if (cur === null || typeof cur !== 'object' || !(k in (cur as object))) return undefined
    cur = (cur as Record<string, unknown>)[k]
  }
  return cur
}

export function setConfigValue(dotted: string, rawValue: string): ThemisConfig {
  const keys = dotted.split('.')
  if (keys.some((k) => !/^[A-Za-z][A-Za-z0-9]*$/.test(k))) throw new ConfigError(`Invalid key: ${dotted}`)
  let value: unknown
  try { value = JSON.parse(rawValue) } catch { value = rawValue }
  if (dotted === 'mcpServers') value = loadMcpServers(JSON.stringify(Array.isArray(value) ? value : []))
  return updateConfig((c) => {
    let cur = c as unknown as Record<string, unknown>
    for (const k of keys.slice(0, -1)) {
      if (typeof cur[k] !== 'object' || cur[k] === null) throw new ConfigError(`Unknown key: ${dotted}`)
      cur = cur[k] as Record<string, unknown>
    }
    cur[keys[keys.length - 1]] = value
  })
}
