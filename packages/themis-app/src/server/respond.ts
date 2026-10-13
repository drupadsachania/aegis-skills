import type { ServerResponse } from 'node:http'

export const API_CSP = "default-src 'none'; frame-ancestors 'none'"
export const ID_RE = /^[A-Za-z0-9_-]{1,128}$/

export class HttpError extends Error {
  constructor(readonly status: number, message: string) { super(message); this.name = 'HttpError' }
}

export function sendJson(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
  const data = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Security-Policy': API_CSP,
    'Content-Length': String(Buffer.byteLength(data)),
    ...headers,
  })
  res.end(data)
}

export function sendText(res: ServerResponse, status: number, text: string): void {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': API_CSP })
  res.end(text)
}

export function asObject(v: unknown): Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new HttpError(400, 'Request invalid')
  return v as Record<string, unknown>
}

export function clampInt(raw: string | null, dflt: number, min: number, max: number): number {
  const n = raw === null ? dflt : Number.parseInt(raw, 10)
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : dflt
}
