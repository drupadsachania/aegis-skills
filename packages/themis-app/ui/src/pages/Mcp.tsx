import { useEffect, useState } from 'react'
import { api } from '../api'
import { ErrorBanner } from '../components/ErrorBanner'
import { StatusBadge } from '../components/StatusBadge'
import { errMsg, useLoad } from '../hooks'

interface Server {
  id: string; transport: string; url?: string; command?: string; args?: string[]
  allowedSkills: string[]; allowWrite?: boolean; maxCalls?: number; timeoutMs?: number
}
interface TestOut { ok: boolean; tools: Array<{ name: string; toolClass: string; disposition: string }>; error?: string }

export function McpPage(_props: { param?: string }) {
  const srv = useLoad<{ servers: Server[] }>('/api/mcp/servers')
  const [text, setText] = useState('[]')
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [tests, setTests] = useState<Record<string, TestOut | 'running'>>({})

  useEffect(() => { if (srv.data) setText(JSON.stringify(srv.data.servers, null, 2)) }, [srv.data])

  const save = async () => {
    let parsed: unknown
    try { parsed = JSON.parse(text) } catch { setError('The server list is not valid JSON.'); return }
    try {
      const r = await api.put<{ dropped: number }>('/api/mcp/servers', { servers: parsed })
      setError(null)
      setNote(r.dropped > 0 ? `Saved. ${r.dropped} invalid entr${r.dropped === 1 ? 'y was' : 'ies were'} dropped.` : 'Saved.')
      await srv.reload()
    } catch (e) { setError(errMsg(e)); setNote('') }
  }

  const test = async (id: string) => {
    setTests((t) => ({ ...t, [id]: 'running' }))
    try { const r = await api.post<TestOut>(`/api/mcp/servers/${id}/test`); setTests((t) => ({ ...t, [id]: r })) } catch (e) { setTests((t) => ({ ...t, [id]: { ok: false, tools: [], error: errMsg(e) } })) }
  }

  return (
    <div>
      <h1>MCP servers</h1>
      <div className="warn">stdio servers start a local command on this machine. Servers with allowWrite let sub-agents <em>propose</em> write/execute actions; each one waits for your approval.</div>
      <ErrorBanner error={error ?? srv.error} />
      {srv.loading ? <p>Loading...</p> : (
        <table>
          <thead><tr><th>Id</th><th>Transport</th><th>URL / command</th><th>Allowed skills</th><th>allowWrite</th><th>maxCalls</th><th>timeoutMs</th><th /></tr></thead>
          <tbody>
            {(srv.data?.servers ?? []).map((s) => {
              const t = tests[s.id]
              return (
                <tr key={s.id}>
                  <td>{s.id}</td><td>{s.transport}</td><td>{s.url ?? [s.command, ...(s.args ?? [])].join(' ')}</td>
                  <td>{s.allowedSkills.join(', ')}</td><td>{String(!!s.allowWrite)}</td><td>{s.maxCalls ?? '-'}</td><td>{s.timeoutMs ?? '-'}</td>
                  <td>
                    <button disabled={t === 'running'} onClick={() => { void test(s.id) }}>Test</button>
                    {t && t !== 'running' ? (
                      <div>
                        {t.error ? <span className="error">{t.error}</span> : null}
                        <ul>{t.tools.map((x) => <li key={x.name}>{x.name} <StatusBadge value={x.toolClass} /> {x.disposition}</li>)}</ul>
                      </div>
                    ) : null}
                  </td>
                </tr>
              )
            })}
            {(srv.data?.servers ?? []).length === 0 ? <tr><td colSpan={8} className="muted">No MCP servers configured.</td></tr> : null}
          </tbody>
        </table>
      )}
      <h2>Edit servers (JSON)</h2>
      <p className="muted">Masked header values (&bull;&bull;&bull;&bull;) are kept unchanged on save.</p>
      <textarea aria-label="MCP servers JSON" value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: '16rem' }} />
      <p><button className="primary" onClick={() => { void save() }}>Save</button> {note}</p>
    </div>
  )
}
