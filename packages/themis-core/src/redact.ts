// Deep redaction for structured data headed to the audit log or an approval
// record. Output is always JSON-safe (no Date, BigInt, undefined or functions).
import { redactSecrets } from './secrets'

const SENSITIVE_KEY_RE = /(pass(word|wd)?|secret|token|api[_-]?key|authorization|cookie|private[_-]?key|credential)/i
const MAX_DEPTH = 20

export function redactDeep(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return '[TRUNCATED]'
  if (typeof value === 'string') return redactSecrets(value)
  if (typeof value === 'bigint') return value.toString()
  if (value === null || typeof value === 'boolean') return value
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol') return null
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map((v) => redactDeep(v, depth + 1))
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue
      out[k] = SENSITIVE_KEY_RE.test(k) && v !== null ? '[REDACTED]' : redactDeep(v, depth + 1)
    }
    return out
  }
  return null
}
