import { useState } from 'react'
import type { ReportRecord, ReportSummary } from '../api'
import { ErrorBanner } from '../components/ErrorBanner'
import { Pre } from '../components/Pre'
import { useLoad, when } from '../hooks'

const stamp = (v: ReportSummary['versions']): string => `Themis ${v.themis} · Aegis ${v.aegis} (osk ${v.osk})`

function Detail({ id }: { id: string }) {
  const rep = useLoad<{ report: ReportRecord }>(`/api/reports/${id}`)
  if (rep.loading) return <p>Loading...</p>
  if (!rep.data) return <ErrorBanner error={rep.error} />
  const r = rep.data.report
  return (
    <div>
      <p><a href="#/reports">Back to reports</a></p>
      <h1>{r.title}</h1>
      <p className="muted">{r.kind} · {when(r.createdAt)} · {stamp(r.versions)}</p>
      <p>
        <a href={`/api/reports/${id}/export?format=md`} download>Download Markdown</a>{' · '}
        <a href={`/api/reports/${id}/export?format=json`} download>Download JSON</a>
      </p>
      <Pre text={r.markdown} />
    </div>
  )
}

export function ReportsPage({ param }: { param?: string }) {
  const [kind, setKind] = useState('')
  const list = useLoad<{ reports: ReportSummary[] }>(param ? null : `/api/reports${kind ? `?kind=${kind}` : ''}`)
  if (param) return <Detail id={param} />
  return (
    <div>
      <h1>Findings &amp; Reports</h1>
      <ErrorBanner error={list.error} />
      <label className="field">
        <span>Kind</span>
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">All</option><option value="themis">Themis</option><option value="audit">Audit</option><option value="exposure">Exposure</option>
        </select>
      </label>
      {list.loading ? <p>Loading...</p> : (
        <table>
          <thead><tr><th>Title</th><th>Kind</th><th>Created</th><th>Versions</th></tr></thead>
          <tbody>
            {(list.data?.reports ?? []).map((r) => (
              <tr key={r.id}><td><a href={`#/reports/${r.id}`}>{r.title}</a></td><td>{r.kind}</td><td>{when(r.createdAt)}</td><td>{stamp(r.versions)}</td></tr>
            ))}
            {(list.data?.reports ?? []).length === 0 ? <tr><td colSpan={4} className="muted">No reports yet.</td></tr> : null}
          </tbody>
        </table>
      )}
    </div>
  )
}
