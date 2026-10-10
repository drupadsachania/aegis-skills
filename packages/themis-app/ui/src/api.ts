// Same-origin JSON client. The session cookie is HttpOnly; the browser sends it and Origin automatically.
export class ApiError extends Error {
  constructor(readonly status: number, message: string) { super(message) }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) throw new ApiError(res.status, (data && data.error) || res.statusText)
  return data as T
}

export const api = {
  get: <T>(p: string) => call<T>('GET', p),
  post: <T>(p: string, b: unknown = {}) => call<T>('POST', p, b),
  put: <T>(p: string, b: unknown) => call<T>('PUT', p, b),
  del: <T>(p: string) => call<T>('DELETE', p),
}

export type ProviderId = 'anthropic' | 'openai' | 'google' | 'local'
export type RunStatus = 'running' | 'awaiting_approval' | 'completed' | 'failed'
export interface RunSummary { runId: string; task: string; status: RunStatus; step: string; createdAt: string; updatedAt: string; pendingApprovals: number; error: string | null }
export interface ApprovalView {
  id: string; runId: string; serverId: string; tool: string; toolClass: 'write' | 'execute'; args: unknown; reason: string
  status: 'pending' | 'approved' | 'rejected' | 'expired'; decidedBy: 'human' | null; createdAt: string; decidedAt: string | null
  execution: 'not_run' | 'executed' | 'failed' | 'needs_reproposal' | 'not_executed'
  argsInMemory: boolean; argsRedacted: boolean; willNeedReproposal: boolean
}
export interface ReportSummary { id: string; kind: 'themis' | 'audit' | 'exposure'; runId: string | null; title: string; createdAt: string; versions: { themis: string; aegis: string; osk: string } }
export interface ReportRecord extends ReportSummary { markdown: string; body: unknown }
export interface KeyStatus { provider: ProviderId; envVar: string; status: 'set' | 'missing' | 'optional'; source: 'env' | 'file' | null; masked: string | null }
export interface TestResult { ok: boolean; provider: ProviderId; model: string | null; latencyMs: number; toolCalling?: 'supported' | 'unsupported'; models?: string[]; error?: string }
