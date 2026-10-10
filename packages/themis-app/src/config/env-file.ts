import fs from 'node:fs'
import { writeFileAtomic } from './config'

const KEY_RE = /^[A-Z][A-Z0-9_]{0,63}$/
const VALUE_RE = /^[\x21-\x7E]{1,4096}$/ // printable ASCII, no spaces, no newlines

export function isValidEnvValue(v: string): boolean { return VALUE_RE.test(v) }

export function parseEnv(text: string): Map<string, string> {
  const out = new Map<string, string>()
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    const q = value[0]
    if ((q === '"' || q === "'") && value.length >= 2 && value.endsWith(q)) value = value.slice(1, -1)
    if (KEY_RE.test(key) && VALUE_RE.test(value)) out.set(key, value)
  }
  return out
}

export function serializeEnv(m: Map<string, string>): string {
  const lines = [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`)
  return ['# Managed by themis. Holds API keys: keep private.', ...lines, ''].join('\n')
}

export function readEnvFile(file: string): Map<string, string> {
  try { return parseEnv(fs.readFileSync(file, 'utf8')) } catch { return new Map() }
}

export function writeEnvFile(file: string, m: Map<string, string>): void {
  for (const [k, v] of m) if (!KEY_RE.test(k) || !VALUE_RE.test(v)) throw new Error(`Refusing to write invalid entry ${k}`)
  writeFileAtomic(file, serializeEnv(m))
}
