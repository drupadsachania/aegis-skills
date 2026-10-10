import { useEffect, useState } from 'react'
import { api } from '../api'
import { ErrorBanner } from '../components/ErrorBanner'
import { Field } from '../components/Field'
import { errMsg, useLoad } from '../hooks'

interface Settings {
  home: string
  files: { config: string; env: string; coreDb: string; appDb: string }
  limits: { maxConcurrentRuns: number }
  dashboard: { port: number }
  versions: { themis: string; aegis: string; osk: string }
  envFileProtection: 'posix-0600' | 'windows-user-profile-acl'
}

export function SettingsPage(_props: { param?: string }) {
  const s = useLoad<Settings>('/api/settings')
  const [max, setMax] = useState('1')
  const [port, setPort] = useState('9120')
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')

  useEffect(() => { if (s.data) { setMax(String(s.data.limits.maxConcurrentRuns)); setPort(String(s.data.dashboard.port)) } }, [s.data])

  const save = async () => {
    try {
      await api.put('/api/settings', { limits: { maxConcurrentRuns: Number(max) }, dashboard: { port: Number(port) } })
      setError(null); setNote('Saved. The port applies the next time the dashboard starts.'); await s.reload()
    } catch (e) { setError(errMsg(e)); setNote('') }
  }

  if (s.loading || !s.data) return <div><h1>Settings</h1>{s.error ? <ErrorBanner error={s.error} /> : <p>Loading...</p>}</div>
  const d = s.data
  return (
    <div>
      <h1>Settings</h1>
      <ErrorBanner error={error} />
      <div className="card">
        <h2>Data</h2>
        <p>Data home: <code>{d.home}</code></p>
        <ul>
          <li>Config: <code>{d.files.config}</code></li>
          <li>Keys: <code>{d.files.env}</code></li>
          <li>Core database: <code>{d.files.coreDb}</code></li>
          <li>App database: <code>{d.files.appDb}</code></li>
        </ul>
        <p className="muted">
          {d.envFileProtection === 'posix-0600'
            ? 'The key file is readable only by your user (0600).'
            : 'On Windows the key file inherits your user-profile permissions (your account, SYSTEM and Administrators). Keep your profile private, or use environment variables instead.'}
        </p>
      </div>
      <div className="card">
        <h2>Limits</h2>
        <Field label="Max concurrent runs (1-4)"><input type="number" min={1} max={4} value={max} onChange={(e) => setMax(e.target.value)} /></Field>
        <Field label="Dashboard port (1024-65535)" hint="Applies next launch."><input type="number" min={1024} max={65535} value={port} onChange={(e) => setPort(e.target.value)} /></Field>
        <button className="primary" onClick={() => { void save() }}>Save</button> {note}
      </div>
      <p className="muted">Themis {d.versions.themis} · Aegis {d.versions.aegis} (osk {d.versions.osk})</p>
    </div>
  )
}
