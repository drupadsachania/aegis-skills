import { sanitiseTask, validateContext, type OrchestrateRequest, type RunState } from '@aegis-skills/themis-core'
import type { Router } from '../router'
import { HttpError, ID_RE, asObject, clampInt, sendJson } from '../respond'
import { streamRun } from '../sse'

const strings = (v: unknown): string[] => (Array.isArray(v) ? v : []).filter((e): e is string => typeof e === 'string')

function summary(run: RunState, pendingApprovals: number) {
  return {
    runId: run.runId,
    task: run.task.slice(0, 200),
    status: run.status,
    step: run.step,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    pendingApprovals,
    error: run.error ?? null,
  }
}

function checkId(id: string): void {
  if (!ID_RE.test(id)) throw new HttpError(400, 'Request invalid')
}

export function registerRunRoutes(r: Router): void {
  r.add('GET', '/api/runs', ({ res, query, deps }) => {
    const limit = clampInt(query.get('limit'), 50, 1, 200)
    const runs = deps.store.listRuns(limit).map((run) =>
      summary(run, deps.store.listApprovals({ runId: run.runId, status: 'pending' }).length))
    sendJson(res, 200, { runs })
  })

  r.add('POST', '/api/runs', async ({ res, body, deps }) => {
    const b = asObject(await body())
    if (typeof b.task !== 'string' || b.task.length > 20000) throw new HttpError(400, 'Request invalid')
    sanitiseTask(b.task) // synchronous 400 for an invalid task (ValidationError maps to 400)
    const raw = typeof b.context === 'object' && b.context !== null && !Array.isArray(b.context) ? (b.context as Record<string, unknown>) : {}
    const context: OrchestrateRequest['context'] = { environments: strings(raw.environments), attackSurfaceTags: strings(raw.attackSurfaceTags) }
    validateContext(context)
    const provider = typeof b.provider === 'string' ? b.provider : undefined
    const { runId, done } = deps.runner.start({ task: b.task, context, provider })
    done.catch(() => undefined)
    sendJson(res, 202, { runId })
  })

  r.add('GET', '/api/runs/:id', ({ res, params, deps }) => {
    checkId(params.id)
    const run = deps.store.getRun(params.id)
    if (!run) throw new HttpError(404, 'Not found')
    const rec = deps.reports.get(params.id)
    const report = rec ? (({ markdown: _m, body: _b, ...rest }) => rest)(rec) : null
    sendJson(res, 200, { run, report, active: deps.runner.isActive(params.id) })
  })

  r.add('POST', '/api/runs/:id/resume', async ({ res, params, deps }) => {
    checkId(params.id)
    const { done } = await deps.runner.resume(params.id)
    done.catch(() => undefined)
    sendJson(res, 202, { runId: params.id })
  })

  r.add('GET', '/api/runs/:id/audit', ({ res, params, deps }) => {
    checkId(params.id)
    if (!deps.store.getRun(params.id)) throw new HttpError(404, 'Not found')
    sendJson(res, 200, { events: deps.store.listAudit(params.id) })
  })

  r.add('GET', '/api/runs/:id/events', ({ req, res, params, deps }) => {
    checkId(params.id)
    if (!deps.store.getRun(params.id)) throw new HttpError(404, 'Not found')
    streamRun(req, res, deps.events, params.id, () => deps.runner.isActive(params.id)) // persisted 'running' without an active runner (crash) must not hang the stream
  })
}
