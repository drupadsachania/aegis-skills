// Governed MCP server registry — the allowlist that decides which external MCP
// servers Themis sub-agents may reach, and under what policy. Deterministic:
// parsed from env config, validated, no LLM involvement. Default-deny — if no
// config is present, no external tools are ever offered to any agent.
//
// Config source: THEMIS_MCP_SERVERS, a JSON array of server entries. Example:
//   [{
//     "id": "osint",
//     "transport": "http",
//     "url": "https://mcp.example.internal/osint",
//     "allowedSkills": ["attack-surface-mapping", "threat-intel-synthesis"],
//     "allowWrite": false
//   }]
//
// On Vercel serverless only "http" servers are reachable; "stdio" spawns a local
// process and is for local development only.

export type McpTransportKind = 'http' | 'stdio'

export interface McpServerConfig {
  id: string
  transport: McpTransportKind
  url?: string                 // http transport
  command?: string             // stdio transport (dev only)
  args?: string[]
  headers?: Record<string, string>
  // Skills whose sub-agents may use this server. Empty/undefined = no skill
  // (default-deny); use ['*'] to allow every skill deliberately.
  allowedSkills: string[]
  // When false (the default), write/execute-classed tools from this server are
  // never auto-invoked — they are surfaced as approval requests instead.
  allowWrite: boolean
  // Hard caps applied per agent run.
  maxCalls: number
  timeoutMs: number
}

const ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/
const DEFAULT_MAX_CALLS = 5
const DEFAULT_TIMEOUT_MS = 15000
const HARD_MAX_CALLS = 20
const HARD_TIMEOUT_MS = 30000

function clampInt(v: unknown, dflt: number, hardMax: number): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : dflt
  return Math.max(1, Math.min(hardMax, n))
}

function coerceServer(raw: unknown): McpServerConfig | null {
  if (typeof raw !== 'object' || raw === null) return null
  const o = raw as Record<string, unknown>

  if (typeof o.id !== 'string' || !ID_RE.test(o.id)) return null
  const transport = o.transport === 'stdio' ? 'stdio' : o.transport === 'http' ? 'http' : null
  if (!transport) return null

  // Transport-specific required fields.
  if (transport === 'http') {
    if (typeof o.url !== 'string') return null
    try {
      const u = new URL(o.url)
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    } catch {
      return null
    }
  } else {
    if (typeof o.command !== 'string' || o.command.length === 0) return null
  }

  const allowedSkills = Array.isArray(o.allowedSkills)
    ? (o.allowedSkills as unknown[]).filter((s): s is string => typeof s === 'string' && s.length > 0)
    : []

  const headers =
    typeof o.headers === 'object' && o.headers !== null
      ? Object.fromEntries(
          Object.entries(o.headers as Record<string, unknown>)
            .filter(([, v]) => typeof v === 'string')
            .map(([k, v]) => [k, v as string]),
        )
      : undefined

  return {
    id: o.id,
    transport,
    url: transport === 'http' ? (o.url as string) : undefined,
    command: transport === 'stdio' ? (o.command as string) : undefined,
    args: Array.isArray(o.args) ? (o.args as unknown[]).filter((a): a is string => typeof a === 'string') : undefined,
    headers,
    allowedSkills,
    allowWrite: o.allowWrite === true,
    maxCalls: clampInt(o.maxCalls, DEFAULT_MAX_CALLS, HARD_MAX_CALLS),
    timeoutMs: clampInt(o.timeoutMs, DEFAULT_TIMEOUT_MS, HARD_TIMEOUT_MS),
  }
}

let _cache: McpServerConfig[] | null = null

/** Parse and validate the configured MCP servers. Invalid entries are dropped. */
export function loadMcpServers(rawEnv: string | undefined = process.env.THEMIS_MCP_SERVERS): McpServerConfig[] {
  if (rawEnv === undefined && _cache !== null) return _cache
  if (!rawEnv || rawEnv.trim() === '') {
    _cache = []
    return _cache
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(rawEnv)
  } catch {
    _cache = []
    return _cache
  }
  if (!Array.isArray(parsed)) {
    _cache = []
    return _cache
  }
  const servers: McpServerConfig[] = []
  const seen = new Set<string>()
  for (const entry of parsed) {
    const s = coerceServer(entry)
    if (s && !seen.has(s.id)) {
      seen.add(s.id)
      servers.push(s)
    }
  }
  _cache = servers
  return servers
}

/** Reset the cache (tests). */
export function _resetMcpConfigCache(): void {
  _cache = null
}

/** Servers a given skill's sub-agent is permitted to use. */
export function serversForSkill(skillName: string, servers: McpServerConfig[] = loadMcpServers()): McpServerConfig[] {
  return servers.filter(
    s => s.allowedSkills.includes('*') || s.allowedSkills.includes(skillName),
  )
}
