import { useEffect, useState } from 'react'
import { api } from './api'
import { useHash } from './hash'
import { RunPage } from './pages/Run'
import { SessionsPage } from './pages/Sessions'
import { ReportsPage } from './pages/Reports'
import { ApprovalsPage } from './pages/Approvals'
import { SkillsPage } from './pages/Skills'
import { McpPage } from './pages/Mcp'
import { ModelsPage } from './pages/Models'
import { SettingsPage } from './pages/Settings'

const PAGES = [
  { id: 'run', label: 'Run', Component: RunPage },
  { id: 'sessions', label: 'Sessions', Component: SessionsPage },
  { id: 'reports', label: 'Findings & Reports', Component: ReportsPage },
  { id: 'approvals', label: 'Approvals', Component: ApprovalsPage },
  { id: 'skills', label: 'Skills', Component: SkillsPage },
  { id: 'mcp', label: 'MCP servers', Component: McpPage },
  { id: 'models', label: 'Models & Keys', Component: ModelsPage },
  { id: 'settings', label: 'Settings', Component: SettingsPage },
] as const

export function App() {
  const [section, param] = useHash()
  const page = PAGES.find((p) => p.id === section) ?? PAGES[0]
  const [stamp, setStamp] = useState('')
  const [pending, setPending] = useState(0)
  useEffect(() => {
    api.get<{ versions: { themis: string; aegis: string; osk: string } }>('/api/health')
      .then((h) => setStamp(`Themis ${h.versions.themis} · Aegis ${h.versions.aegis} (osk ${h.versions.osk})`))
      .catch(() => setStamp('offline'))
    const poll = () => api.get<{ approvals: unknown[] }>('/api/approvals?status=pending').then((r) => setPending(r.approvals.length)).catch(() => undefined)
    poll()
    const t = setInterval(poll, 5000)
    return () => clearInterval(t)
  }, [])
  const Page = page.Component
  return (
    <div className="shell">
      <nav className="nav">
        <div className="brand">Themis</div>
        {PAGES.map((p) => (
          <a key={p.id} href={`#/${p.id}`} className={p.id === page.id ? 'active' : ''}>
            {p.label}{p.id === 'approvals' && pending > 0 ? <span className="count">{pending}</span> : null}
          </a>
        ))}
        <div className="stamp">{stamp}</div>
      </nav>
      <main className="main"><Page param={param} /></main>
    </div>
  )
}
