import { useState } from 'react'
import { api, type ApprovalView, type RunSummary } from '../api'
import { ErrorBanner } from '../components/ErrorBanner'
import { Pre } from '../components/Pre'
import { StatusBadge } from '../components/StatusBadge'
import { errMsg, shortId, useLoad, when } from '../hooks'

interface Run {
  runId: string; task: string; status: string; step: string; error: string | null
  versions: { themis: string; aegis: string; osk: string }
  subTasks: Array<{ id: string; skill: string; phase: number; dependsOn: string[] }>
  results: Array<{ subTaskId: string; skill: string; confidence: string; guardrail: string; findings: string }>
}

function Detail({ id }: { id: string }) {
  const run = useLoad<{ run: Run; report: { id: string } | null; active: boolean }>(`/api/runs/${id}`, 3000)
  const audit = useLoad<{ events: unknown[] }>(`/api/runs/${id}/audit`)
  const approvals = useLoad<{ approvals: ApprovalView[] }>(`/api/approvals?runId=${id}`, 5000)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (run.loading) return <p>Loading...</p>
  if (!run.data) return <ErrorBanner error={run.error} />
  const { run: r, active } = run.data
  const pendingCount = (approvals.data?.approvals ?? []).filter((a) => a.status === 'pending').length
  const canResume = r.status === 'failed' || (r.status === 'awaiting_approval' && pendingCount === 0) || (r.status === 'running' && !active)

  const resume = async () => {
    setBusy(true)
    try { await api.post(`/api/runs/${id}/resume`); setActionError(null); await run.reload() } catch (e) { setActionError(errMsg(e)) } finally { setBusy(false) }
  }

  return (
    <div>
      <p><a href="#/sessions">Back to sessions</a></p>
      <h1>Session {shortId(r.runId)}</h1>
      <ErrorBanner error={actionError ?? run.error} />
      <div className="card">
        <p><StatusBadge value={r.status} /> step: {r.step}</p>
        <p>{r.task}</p>
        {r.error ? <ErrorBanner error={r.error} /> : null}
        <p className="muted">Themis {r.versions.themis} · Aegis {r.versions.aegis} (osk {r.versions.osk})</p>
        {canResume ? <button className="primary" disabled={busy} onClick={() => { void resume() }}>Resume</button> : null}
        {run.data.report ? <a href={`#/reports/${run.data.report.id}`}>View report</a> : null}
      </div>
      <h2>Sub-tasks</h2>
      <table>
        <thead><tr><th>Id</th><th>Skill</th><th>Phase</th><th>Depends on</th></tr></thead>
        <tbody>{r.subTasks.map((s) => <tr key={s.id}><td>{s.id}</td><td>{s.skill}</td><td>{s.phase}</td><td>{s.dependsOn.join(', ') || '-'}</td></tr>)}</tbody>
      </table>
      <h2>Results</h2>
      {r.results.length === 0 ? <p className="muted">No results yet.</p> : r.results.map((x) => (
        <div className="card" key={x.subTaskId}>
          <strong>{x.skill}</strong> <span className="muted">({x.subTaskId})</span> confidence {x.confidence} · guardrail <StatusBadge value={x.guardrail} />
          <details><summary>Findings</summary><Pre text={x.findings} /></details>
        </div>
      ))}
      <h2>Approvals</h2>
      {(approvals.data?.approvals ?? []).length === 0 ? <p className="muted">None.</p> : (
        <ul>{approvals.data!.approvals.map((a) => <li key={a.id}><a href="#/approvals">{a.serverId}/{a.tool}</a> <StatusBadge value={a.status} /> <StatusBadge value={a.execution} /></li>)}</ul>
      )}
      <h2>Audit events</h2>
      <details><summary>{audit.data?.events.length ?? 0} events</summary><Pre text={JSON.stringify(audit.data?.events ?? [], null, 2)} /></details>
    </div>
  )
}

export function SessionsPage({ param }: { param?: string }) {
  const list = useLoad<{ runs: RunSummary[] }>(param ? null : '/api/runs', 5000)
  if (param) return <Detail id={param} />
  return (
    <div>
      <h1>Sessions</h1>
      <ErrorBanner error={list.error} />
      {list.loading ? <p>Loading...</p> : (
        <table>
          <thead><tr><th>Id</th><th>Task</th><th>Status</th><th>Step</th><th>Pending</th><th>Updated</th></tr></thead>
          <tbody>
            {(list.data?.runs ?? []).map((r) => (
              <tr key={r.runId}>
                <td><a href={`#/sessions/${r.runId}`}>{shortId(r.runId)}</a></td>
                <td>{r.task}</td><td><StatusBadge value={r.status} /></td><td>{r.step}</td><td>{r.pendingApprovals}</td><td>{when(r.updatedAt)}</td>
              </tr>
            ))}
            {(list.data?.runs ?? []).length === 0 ? <tr><td colSpan={6} className="muted">No sessions yet. Start one on the Run page.</td></tr> : null}
          </tbody>
        </table>
      )}
    </div>
  )
}
