import type { Router } from '../router'
import { HttpError, ID_RE, clampInt, sendJson } from '../respond'
import type { ReportKind } from '../../store/reports'

const KINDS = ['themis', 'audit', 'exposure'] as const

export function registerReportRoutes(r: Router): void {
  r.add('GET', '/api/reports', ({ res, query, deps }) => {
    const kind = query.get('kind')
    if (kind !== null && !(KINDS as readonly string[]).includes(kind)) throw new HttpError(400, 'Request invalid')
    const limit = clampInt(query.get('limit'), 50, 1, 200)
    sendJson(res, 200, { reports: deps.reports.list({ kind: (kind ?? undefined) as ReportKind | undefined, limit }) })
  })

  r.add('GET', '/api/reports/:id', ({ res, params, deps }) => {
    if (!ID_RE.test(params.id)) throw new HttpError(400, 'Request invalid')
    const report = deps.reports.get(params.id)
    if (!report) throw new HttpError(404, 'Not found')
    sendJson(res, 200, { report })
  })

  r.add('GET', '/api/reports/:id/export', ({ res, params, query, deps }) => {
    if (!ID_RE.test(params.id)) throw new HttpError(400, 'Request invalid')
    const format = query.get('format') ?? 'md'
    if (format !== 'md' && format !== 'json') throw new HttpError(400, 'Request invalid')
    const report = deps.reports.get(params.id)
    if (!report) throw new HttpError(404, 'Not found')
    const data = format === 'md'
      ? report.markdown
      : JSON.stringify({ ...(report.body as Record<string, unknown> | null), versions: report.versions }, null, 2)
    res.writeHead(200, {
      'Content-Type': format === 'md' ? 'text/markdown; charset=utf-8' : 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="themis-${report.kind}-${report.id}.${format}"`,
      'Content-Length': String(Buffer.byteLength(data)),
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'",
    })
    res.end(data)
  })
}
