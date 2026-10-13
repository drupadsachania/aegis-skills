import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { ErrorBanner } from '../components/ErrorBanner'
import { Field } from '../components/Field'
import { Pre } from '../components/Pre'
import { StatusBadge } from '../components/StatusBadge'
import { errMsg } from '../hooks'

type Mode = 'themis' | 'audit' | 'exposure'
const AUTH_NOTE = 'Requires authorization: use only on systems you own or are authorized to assess.'
const STANDARDS = ['cis-l1', 'cis-l2', 'nist-csf', 'iso27001', 'soc2', 'pci-dss', 'hipaa', 'iec-62443', 'nist-800-53']
const csv = (s: string): string[] => s.split(',').map((x) => x.trim()).filter(Boolean)

interface ModelsView { defaultProvider: string | null; configured: string[] }
interface TimelineRow { key: string; text: string; status: string }

function ProviderSelect({ value, onChange, configured }: { value: string; onChange: (v: string) => void; configured: string[] }) {
  return (
    <Field label="Provider">
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Default</option>
        {configured.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
    </Field>
  )
}

function ThemisForm({ configured }: { configured: string[] }) {
  const [task, setTask] = useState('')
  const [provider, setProvider] = useState('')
  const [envs, setEnvs] = useState('')
  const [tags, setTags] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [runId, setRunId] = useState<string | null>(null)
  const [rows, setRows] = useState<TimelineRow[]>([])
  const [status, setStatus] = useState<string>('')
  const [report, setReport] = useState<{ markdown: string; id: string } | null>(null)
  const es = useRef<EventSource | null>(null)

  useEffect(() => () => es.current?.close(), [])

  const finish = async (id: string) => {
    try {
      const r = await api.get<{ run: { status: string; error: string | null }; report: { id: string } | null }>(`/api/runs/${id}`)
      setStatus(r.run.status)
      if (r.run.error) setError(r.run.error)
      if (r.report) {
        const full = await api.get<{ report: { markdown: string } }>(`/api/reports/${r.report.id}`)
        setReport({ markdown: full.report.markdown, id: r.report.id })
      }
    } catch (e) { setError(errMsg(e)) }
  }

  const start = async () => {
    setError(null); setRows([]); setReport(null); setStatus('running')
    try {
      const { runId: id } = await api.post<{ runId: string }>('/api/runs', {
        task, provider: provider || undefined, context: { environments: csv(envs), attackSurfaceTags: csv(tags) },
      })
      setRunId(id)
      es.current?.close()
      const src = new EventSource(`/api/runs/${id}/events`)
      es.current = src
      src.addEventListener('run', (ev) => {
        const { seq, event } = JSON.parse((ev as MessageEvent).data) as { seq: number; event: Record<string, string> }
        if (event.type === 'step') setRows((r) => [...r, { key: `s${seq}`, text: `step ${event.step}`, status: event.status }])
        else if (event.type === 'subtask') setRows((r) => [...r, { key: `t${seq}`, text: `sub-task ${event.skill} (${event.subTaskId})`, status: event.status }])
        else if (event.type === 'approval') setRows((r) => [...r, { key: `a${seq}`, text: 'approval decided', status: event.status }])
        else if (event.type === 'notice') setRows((r) => [...r, { key: `n${seq}`, text: event.message, status: 'pending' }])
        else if (event.type === 'status') setStatus(event.status)
      })
      src.addEventListener('end', () => { src.close(); void finish(id) })
      src.onerror = () => { src.close(); void finish(id) }
    } catch (e) { setError(errMsg(e)); setStatus('') }
  }

  return (
    <div>
      <ErrorBanner error={error} />
      <div className="card">
        <Field label="Task" hint={`${task.length}/4000`}>
          <textarea maxLength={4000} value={task} onChange={(e) => setTask(e.target.value)} />
        </Field>
        <div className="row">
          <ProviderSelect value={provider} onChange={setProvider} configured={configured} />
          <Field label="Environments" hint="comma-separated"><input type="text" value={envs} onChange={(e) => setEnvs(e.target.value)} /></Field>
          <Field label="Tags" hint="comma-separated"><input type="text" value={tags} onChange={(e) => setTags(e.target.value)} /></Field>
        </div>
        <button className="primary" disabled={!task.trim() || status === 'running'} onClick={() => { void start() }}>Start</button>
        <p className="muted">{AUTH_NOTE}</p>
      </div>
      {runId ? (
        <div className="card">
          <p>Run <a href={`#/sessions/${runId}`}>{runId.slice(0, 8)}</a> {status ? <StatusBadge value={status} /> : null}</p>
          <table><tbody>{rows.map((r) => <tr key={r.key}><td>{r.text}</td><td><StatusBadge value={r.status} /></td></tr>)}</tbody></table>
          {status === 'awaiting_approval' ? <div className="warn">This run is paused and needs your decision. <a href="#/approvals">Open Approvals</a></div> : null}
          {report ? (
            <>
              <Pre text={report.markdown} />
              <p>
                <a href={`#/reports/${report.id}`}>Open report</a>{' · '}
                <a href={`/api/reports/${report.id}/export?format=md`} download>Markdown</a>{' · '}
                <a href={`/api/reports/${report.id}/export?format=json`} download>JSON</a>
              </p>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

interface AuditOut { reportId: string; executiveSummary: string; findings: Array<{ controlId: string; severity: string; title: string; recommendation: string }> }

function AuditForm({ configured }: { configured: string[] }) {
  const [input, setInput] = useState('')
  const [inputType, setInputType] = useState('description')
  const [standards, setStandards] = useState<string[]>([])
  const [systemType, setSystemType] = useState('')
  const [envs, setEnvs] = useState('')
  const [provider, setProvider] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [out, setOut] = useState<AuditOut | null>(null)

  const submit = async () => {
    setBusy(true); setError(null); setOut(null)
    try {
      setOut(await api.post<AuditOut>('/api/audit', { input, inputType, standards, provider: provider || undefined, context: { systemType: systemType || undefined, environments: csv(envs) } }))
    } catch (e) { setError(errMsg(e)) } finally { setBusy(false) }
  }
  const toggle = (s: string) => setStandards((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))

  return (
    <div>
      <ErrorBanner error={error} />
      <div className="card">
        <Field label="Input" hint={`${input.length}/12000`}><textarea maxLength={12000} value={input} onChange={(e) => setInput(e.target.value)} /></Field>
        <div className="row">
          <Field label="Input type">
            <select value={inputType} onChange={(e) => setInputType(e.target.value)}>
              <option value="description">Description</option><option value="config">Config</option><option value="policy">Policy</option><option value="evidence-package">Evidence package</option>
            </select>
          </Field>
          <Field label="System type"><input type="text" value={systemType} onChange={(e) => setSystemType(e.target.value)} /></Field>
          <Field label="Environments" hint="comma-separated"><input type="text" value={envs} onChange={(e) => setEnvs(e.target.value)} /></Field>
          <ProviderSelect value={provider} onChange={setProvider} configured={configured} />
        </div>
        <div className="checks" role="group" aria-label="Standards">
          {STANDARDS.map((s) => <label key={s}><input type="checkbox" checked={standards.includes(s)} onChange={() => toggle(s)} />{s}</label>)}
        </div>
        <button className="primary" disabled={!input.trim() || busy} onClick={() => { void submit() }}>{busy ? 'Running...' : 'Run audit'}</button>
        <p className="muted">{AUTH_NOTE}</p>
      </div>
      {out ? (
        <div className="card">
          <h2>Executive summary</h2>
          <Pre text={out.executiveSummary} />
          <table>
            <thead><tr><th>Severity</th><th>Control</th><th>Title</th><th>Recommendation</th></tr></thead>
            <tbody>{out.findings.map((f, i) => <tr key={i}><td>{f.severity}</td><td>{f.controlId}</td><td>{f.title}</td><td>{f.recommendation}</td></tr>)}</tbody>
          </table>
          <p><a href={`#/reports/${out.reportId}`}>Open report</a></p>
        </div>
      ) : null}
    </div>
  )
}

interface ExposureOut { reportId: string; executiveSummary: string; case: { workflowState: string }; risk: { before: { score: number }; after?: { score: number } | null } }

function ExposureForm({ configured }: { configured: string[] }) {
  const [input, setInput] = useState('')
  const [cve, setCve] = useState('')
  const [kev, setKev] = useState(false)
  const [epss, setEpss] = useState('')
  const [auth, setAuth] = useState({ authorized: false, scopeConfirmed: false, targetIdentityVerified: false, maintenanceWindow: false })
  const [approver, setApprover] = useState('')
  const [assetId, setAssetId] = useState('')
  const [criticality, setCriticality] = useState('unknown')
  const [crown, setCrown] = useState(false)
  const [provider, setProvider] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [out, setOut] = useState<ExposureOut | null>(null)

  const submit = async () => {
    setBusy(true); setError(null); setOut(null)
    try {
      setOut(await api.post<ExposureOut>('/api/exposure', {
        input, cve: cve || undefined, kevListed: kev, epss: epss === '' ? undefined : Number(epss), provider: provider || undefined,
        authorization: { ...auth, approver: approver || undefined },
        context: { assetId: assetId || undefined, businessCriticality: criticality, crownJewel: crown },
      }))
    } catch (e) { setError(errMsg(e)) } finally { setBusy(false) }
  }
  const authBox = (k: keyof typeof auth, label: string) => (
    <label key={k}><input type="checkbox" checked={auth[k]} onChange={(e) => setAuth({ ...auth, [k]: e.target.checked })} />{label}</label>
  )

  return (
    <div>
      <ErrorBanner error={error} />
      <div className="card">
        <Field label="Input" hint={`${input.length}/12000`}><textarea maxLength={12000} value={input} onChange={(e) => setInput(e.target.value)} /></Field>
        <div className="row">
          <Field label="CVE"><input type="text" placeholder="CVE-2024-12345" value={cve} onChange={(e) => setCve(e.target.value)} /></Field>
          <Field label="EPSS (0-1)"><input type="number" min={0} max={1} step={0.001} value={epss} onChange={(e) => setEpss(e.target.value)} /></Field>
          <Field label="Approver"><input type="text" value={approver} onChange={(e) => setApprover(e.target.value)} /></Field>
          <Field label="Asset id"><input type="text" value={assetId} onChange={(e) => setAssetId(e.target.value)} /></Field>
          <Field label="Business criticality">
            <select value={criticality} onChange={(e) => setCriticality(e.target.value)}>
              {['crown-jewel', 'high', 'medium', 'low', 'unknown'].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <ProviderSelect value={provider} onChange={setProvider} configured={configured} />
        </div>
        <div className="checks" role="group" aria-label="Authorization">
          <label><input type="checkbox" checked={kev} onChange={(e) => setKev(e.target.checked)} />Listed in CISA KEV</label>
          <label><input type="checkbox" checked={crown} onChange={(e) => setCrown(e.target.checked)} />Crown jewel</label>
          {authBox('authorized', 'Authorized')}
          {authBox('scopeConfirmed', 'Scope confirmed')}
          {authBox('targetIdentityVerified', 'Target identity verified')}
          {authBox('maintenanceWindow', 'Maintenance window')}
        </div>
        <button className="primary" disabled={!input.trim() || busy} onClick={() => { void submit() }}>{busy ? 'Running...' : 'Run exposure validation'}</button>
        <p className="muted">{AUTH_NOTE}</p>
      </div>
      {out ? (
        <div className="card">
          <p>Workflow state: <StatusBadge value={out.case.workflowState} /></p>
          <p>Risk before: {out.risk.before.score} · after: {out.risk.after ? out.risk.after.score : 'not re-scored'}</p>
          <h2>Executive summary</h2>
          <Pre text={out.executiveSummary} />
          <p><a href={`#/reports/${out.reportId}`}>Open report</a></p>
        </div>
      ) : null}
    </div>
  )
}

export function RunPage(_props: { param?: string }) {
  const [mode, setMode] = useState<Mode>('themis')
  const [models, setModels] = useState<ModelsView | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { api.get<ModelsView>('/api/models').then(setModels).catch((e) => setError(errMsg(e))) }, [])
  const configured = models?.configured ?? []
  return (
    <div>
      <h1>Run</h1>
      <ErrorBanner error={error} />
      {models && configured.length === 0 ? <div className="warn">No provider is configured. Add a key or a local model on <a href="#/models">Models &amp; Keys</a>.</div> : null}
      <div className="checks" role="tablist">
        {([['themis', 'Themis task'], ['audit', 'Compliance audit'], ['exposure', 'Exposure validation']] as const).map(([id, label]) => (
          <button key={id} className={mode === id ? 'primary' : ''} onClick={() => setMode(id)}>{label}</button>
        ))}
      </div>
      {mode === 'themis' ? <ThemisForm configured={configured} /> : mode === 'audit' ? <AuditForm configured={configured} /> : <ExposureForm configured={configured} />}
    </div>
  )
}
