import { useState } from 'react'
import { api } from '../api'
import { ErrorBanner } from '../components/ErrorBanner'
import { StatusBadge } from '../components/StatusBadge'
import { errMsg, useLoad } from '../hooks'
import aegisIcon from '@brand/aegis-icon.svg'

interface Skill { name: string; description: string; phases: number; enabled: boolean; intelAsOf: string | null }
const THIRTY_DAYS = 30 * 24 * 3600 * 1000
const stale = (d: string | null): boolean => d === null || Number.isNaN(Date.parse(d)) || Date.now() - Date.parse(d) > THIRTY_DAYS

export function SkillsPage(_props: { param?: string }) {
  const sk = useLoad<{ aegis: { version: string; osk: string }; skills: Skill[] }>('/api/skills')
  const [error, setError] = useState<string | null>(null)

  const toggle = async (s: Skill) => {
    try { await api.put(`/api/skills/${s.name}`, { enabled: !s.enabled }); setError(null); await sk.reload() } catch (e) { setError(errMsg(e)) }
  }

  return (
    <div>
      <h1>Skills</h1>
      <ErrorBanner error={error ?? sk.error} />
      {sk.loading || !sk.data ? <p>Loading...</p> : (
        <>
          <p className="muted aegis-cue"><img src={aegisIcon} alt="" width={20} height={20} /><span>Aegis skills {sk.data.aegis.version} · osk {sk.data.aegis.osk}</span></p>
          <table>
            <thead><tr><th>Name</th><th>Description</th><th>Phases</th><th>Intel as of</th><th>Enabled</th></tr></thead>
            <tbody>
              {sk.data.skills.map((s) => (
                <tr key={s.name}>
                  <td>{s.name}</td><td>{s.description}</td><td>{s.phases}</td>
                  <td>{s.intelAsOf ?? '-'} {stale(s.intelAsOf) ? <StatusBadge value="stale" /> : null}</td>
                  <td><input type="checkbox" aria-label={`Enable ${s.name}`} checked={s.enabled} onChange={() => { void toggle(s) }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted">Disabled skills are not offered to the planner or sub-agents.</p>
        </>
      )}
    </div>
  )
}
