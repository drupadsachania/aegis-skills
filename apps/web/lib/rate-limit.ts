// Best-effort, in-memory rate limiter for the hosted Aegis MCP route.
//
// Limits (be honest about them):
//  - State lives in the memory of one server instance. On serverless hosting every instance
//    (and every cold start) has its own counters, so this is a brake on bursts from one
//    client, not a hard quota. Nothing is stored outside the process and nothing is logged.
//  - The client IP comes from the first hop of x-forwarded-for. Vercel overwrites that header
//    and does not forward client-supplied values (https://vercel.com/docs/headers/request-headers,
//    retrieved 2026-10-12). On any other host a client can set the header itself, which would
//    let it choose its own bucket and even claim an exempt address, so do not rely on this
//    limiter outside Vercel without a trusted proxy in front.
//
// Anthropic outbound range: https://platform.claude.com/docs/en/api/ip-addresses lists
// 160.79.104.0/21 as the stable IPv4 range for outbound requests such as MCP tool calls
// (retrieved 2026-10-12). Re-check before each directory submission.

export const WINDOW_MS = 60_000
export const MAX = 120
const MAX_TRACKED = 10_000

const hits = new Map<string, { n: number; reset: number }>()

function ipv4ToInt(ip: string): number | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip)
  if (!m) return null
  let v = 0
  for (let i = 1; i <= 4; i++) {
    const o = Number(m[i])
    if (o > 255) return null
    v = v * 256 + o
  }
  return v
}

const EXEMPT = { base: ipv4ToInt('160.79.104.0') as number, bits: 21 }

/** True for an address inside Anthropic's published outbound range. IPv4 only; anything else is not exempt. */
export function isExempt(ip: string): boolean {
  const v = ipv4ToInt(ip.replace(/^::ffff:/i, ''))
  if (v === null) return false
  const block = 2 ** (32 - EXEMPT.bits)
  return Math.floor(v / block) === Math.floor(EXEMPT.base / block)
}

/** Count a request from `ip`. Returns true when it is over the limit for the current window. */
export function rateLimited(ip: string, now = Date.now()): boolean {
  if (isExempt(ip)) return false
  if (hits.size >= MAX_TRACKED) {
    for (const [k, e] of hits) if (now > e.reset) hits.delete(k)
    if (hits.size >= MAX_TRACKED) hits.clear() // still full: drop all counters rather than grow
  }
  const e = hits.get(ip)
  if (!e || now > e.reset) {
    hits.set(ip, { n: 1, reset: now + WINDOW_MS })
    return false
  }
  e.n += 1
  return e.n > MAX
}

/** First hop of x-forwarded-for, or 'unknown' when the header is absent or empty. */
export function clientIp(headers: Headers): string {
  const first = (headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim()
  return first ? first.slice(0, 64) : 'unknown'
}

/** Test helper: clear all counters. */
export function resetRateLimit(): void {
  hits.clear()
}
