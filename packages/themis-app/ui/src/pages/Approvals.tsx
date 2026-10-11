import { useState } from 'react'
import { api, type ApprovalView } from '../api'
import { ErrorBanner } from '../components/ErrorBanner'
import { Pre } from '../components/Pre'
import { StatusBadge } from '../components/StatusBadge'
import { errMsg, shortId, useLoad, when } from '../hooks'

export function ApprovalsPage(_props: { param?: string }) {
  const pending = useLoad<{ approvals: ApprovalView[] }>('/api/approvals?status=pending', 5000)
  const all = useLoad<{ approvals: ApprovalView[] }>('/api/approvals', 5000)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const decide = async (a: ApprovalView, decision: 'approved' | 'rejected') => {
    if (decision === 'approved' && !window.confirm(`Run ${a.serverId}/${a.tool} (${a.toolClass}) now?`)) return
    try {
      const r = await api.post<{ runResumed: boolean }>(`/api/approvals/${a.id}/decision`, { decision })
      setError(null)
      setNote(r.runResumed ? 'Run resumed' : '')
      await Promise.all([pending.reload(), all.reload()])
    } catch (e) { setError(errMsg(e)) }
  }

  const decided = (all.data?.approvals ?? []).filter((a) => a.status !== 'pending')
  return (
    <div>
      <h1>Approvals</h1>
      <p className="muted">Nothing that writes or executes runs without your click.</p>
      <ErrorBanner error={error ?? pending.error ?? all.error} />
      {note ? <p>{note}</p> : null}
      <h2>Pending</h2>
      {pending.loading ? <p>Loading...</p> : (pending.data?.approvals ?? []).length === 0 ? <p className="muted">Nothing is waiting for approval.</p> : (
        (pending.data?.approvals ?? []).map((a) => (
          <div className="card needs-approval" key={a.id}>
            <p><a href={`#/sessions/${a.runId}`}>Run {shortId(a.runId)}</a> · <strong>{a.serverId}/{a.tool}</strong> <StatusBadge value={a.toolClass} /></p>
            <p>{a.reason}</p>
            <Pre text={JSON.stringify(a.args, null, 2)} />
            <p className="muted">Proposed {when(a.createdAt)}</p>
            {a.willNeedReproposal ? (
              <div className="warn">Themis restarted after this was proposed and its arguments contained secrets. Approving records your decision, but the action cannot run and must be proposed again.</div>
            ) : null}
            <button className="primary" onClick={() => { void decide(a, 'approved') }}>Approve</button>
            <button onClick={() => { void decide(a, 'rejected') }}>Reject</button>
          </div>
        ))
      )}
      <h2>Decided</h2>
      <table>
        <thead><tr><th>Action</th><th>Run</th><th>Decision</th><th>Execution</th><th>Decided</th></tr></thead>
        <tbody>
          {decided.map((a) => (
            <tr key={a.id}><td>{a.serverId}/{a.tool}</td><td><a href={`#/sessions/${a.runId}`}>{shortId(a.runId)}</a></td><td><StatusBadge value={a.status} /></td><td><StatusBadge value={a.execution} /></td><td>{when(a.decidedAt)}</td></tr>
          ))}
          {decided.length === 0 ? <tr><td colSpan={5} className="muted">No decisions yet.</td></tr> : null}
        </tbody>
      </table>
    </div>
  )
}
