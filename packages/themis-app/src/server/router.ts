import type { IncomingMessage, ServerResponse } from 'node:http'
import type { AppDeps } from './deps'
import { HttpError } from './respond'

export interface RouteCtx {
  req: IncomingMessage
  res: ServerResponse
  params: Record<string, string>
  query: URLSearchParams
  deps: AppDeps
  body(): Promise<unknown>
}
export type Handler = (c: RouteCtx) => Promise<void> | void
interface Route { method: string; re: RegExp; keys: string[]; handler: Handler }

export class Router {
  private readonly routes: Route[] = []

  add(method: string, pattern: string, handler: Handler): this {
    const keys: string[] = []
    const re = new RegExp('^' + pattern.replace(/:([a-zA-Z]+)/g, (_m, k: string) => { keys.push(k); return '([^/]+)' }) + '$')
    this.routes.push({ method, re, keys, handler })
    return this
  }

  match(method: string, pathname: string): { handler: Handler; params: Record<string, string> } | 'method_not_allowed' | null {
    let pathMatched = false
    for (const r of this.routes) {
      const m = r.re.exec(pathname)
      if (!m) continue
      pathMatched = true
      if (r.method !== method) continue
      const params: Record<string, string> = {}
      try { r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]) }) } catch { throw new HttpError(400, 'Request invalid') }
      return { handler: r.handler, params }
    }
    return pathMatched ? 'method_not_allowed' : null
  }
}
