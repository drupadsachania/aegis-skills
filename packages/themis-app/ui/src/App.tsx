import { useEffect, useState, type ReactNode } from 'react'
import { api } from './api'
import { useHash } from './hash'
import { useTheme } from './theme'
import { RunPage } from './pages/Run'
import { SessionsPage } from './pages/Sessions'
import { ReportsPage } from './pages/Reports'
import { ApprovalsPage } from './pages/Approvals'
import { SkillsPage } from './pages/Skills'
import { McpPage } from './pages/Mcp'
import { ModelsPage } from './pages/Models'
import { SettingsPage } from './pages/Settings'

// Stroke icons on a 24px grid (decorative; the label is always in the DOM).
const I = (d: ReactNode) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{d}</svg>
const ICONS: Record<string, ReactNode> = {
  run: I(<path d="M7 5l11 7-11 7z" />),
  sessions: I(<><path d="M4 6h16M4 12h16M4 18h10" /></>),
  reports: I(<><path d="M7 3h8l4 4v14H7z" /><path d="M14 3v5h5M10 13h6M10 17h6" /></>),
  approvals: I(<><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M8.5 12l2.5 2.5L15.5 10" /></>),
  skills: I(<path d="M12 3l3 6 6 1-4.5 4.2L18 21l-6-3.2L6 21l1.5-6.8L3 10l6-1z" />),
  mcp: I(<><rect x="3" y="4" width="18" height="6" rx="2" /><rect x="3" y="14" width="18" height="6" rx="2" /><path d="M7 7h.01M7 17h.01" /></>),
  models: I(<><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M16 7l3 3M14 9l2 2" /></>),
  settings: I(<><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></>),
}

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

function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect className="mk-a" x="4" y="9" width="14" height="14" rx="3" transform="rotate(45 11 16)" />
      <circle className="mk-t" cx="21.5" cy="16" r="8" />
    </svg>
  )
}

function ThemeToggle() {
  const [theme, toggle] = useTheme()
  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-pressed={theme === 'dark'}>
      <span className="ico" aria-hidden="true">{theme === 'dark' ? I(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>) : I(<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />)}</span>
      <span className="lbl">Dark theme: {theme === 'dark' ? 'on' : 'off'}</span>
    </button>
  )
}

export function App() {
  const [section, param] = useHash()
  const page = PAGES.find((p) => p.id === section) ?? PAGES[0]
  const [stamp, setStamp] = useState('')
  const [offline, setOffline] = useState(false)
  const [pending, setPending] = useState(0)
  const [menu, setMenu] = useState(false)
  const [updated, setUpdated] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    api.get<{ versions: { themis: string; aegis: string; osk: string } }>('/api/health')
      .then((h) => { setStamp(`Themis ${h.versions.themis} · Aegis ${h.versions.aegis} (osk ${h.versions.osk})`); setOffline(false) })
      .catch(() => { setStamp('offline'); setOffline(true) })
    const poll = () => api.get<{ approvals: unknown[] }>('/api/approvals?status=pending')
      .then((r) => { setPending(r.approvals.length); setOffline(false); setUpdated(Date.now()) })
      .catch(() => { setOffline(true) })
    void poll()
    const t = setInterval(() => { void poll() }, 5000)
    const tick = setInterval(() => setNow(Date.now()), 1000)
    return () => { clearInterval(t); clearInterval(tick) }
  }, [])
  useEffect(() => setMenu(false), [page.id])

  const Page = page.Component
  const ago = updated === null ? null : Math.max(0, Math.round((now - updated) / 1000))
  // One banner at a time, most severe wins: unreachable > approvals waiting.
  const banner = offline
    ? { tone: 'bad', role: 'alert', glyph: '▲', title: 'Cannot reach Themis.', body: `Could not reach the dashboard server at ${window.location.host}. Nothing was changed. Check that \`themis dashboard\` is still running, then reload.` }
    : pending > 0
      ? { tone: 'warn', role: 'status', glyph: '❚❚', title: `${pending} action${pending === 1 ? '' : 's'} need${pending === 1 ? 's' : ''} your approval.`, body: 'Nothing that writes or executes runs until you decide.' }
      : null

  return (
    <div className="shell">
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="topbar">
        <a className="brand" href="#/run"><BrandMark /><span>Themis</span></a>
        <button type="button" className="menu-btn" aria-expanded={menu} aria-controls="app-nav" onClick={() => setMenu((m) => !m)}>
          <span className="ico" aria-hidden="true">{I(<path d="M4 8h16M4 16h16" />)}</span>
          <span className="sr-only">Menu</span>
        </button>
      </header>
      <nav className="nav" id="app-nav" aria-label="Dashboard" data-open={menu}>
        <a className="brand" href="#/run"><BrandMark /><span className="lbl">Themis</span></a>
        <ul>
          {PAGES.map((p) => (
            <li key={p.id}>
              <a href={`#/${p.id}`} className={p.id === page.id ? 'active' : ''} aria-current={p.id === page.id ? 'page' : undefined} title={p.label}>
                <span className="ico">{ICONS[p.id]}</span>
                <span className="lbl">{p.label}</span>
                {p.id === 'approvals' && pending > 0 ? <span className="count attention" key={pending}><span className="sr-only">{pending} pending: </span>{pending}</span> : null}
              </a>
            </li>
          ))}
        </ul>
        <div className="rail-foot">
          <ThemeToggle />
          <div className="local" title="The dashboard only listens on loopback">
            <span className="dot" aria-hidden="true" />
            <span className="lbl">Local-first · {window.location.host}<br />Served to this machine only</span>
          </div>
          <div className="stamp lbl">{stamp}{ago !== null ? <><br />Updated {ago}s ago</> : null}</div>
        </div>
      </nav>
      <main className="main" id="main" tabIndex={-1}>
        {banner ? (
          <div className={`banner banner-${banner.tone}`} role={banner.role}>
            <span className="glyph" aria-hidden="true">{banner.glyph}</span>
            <span><strong>{banner.title}</strong> {banner.body}{banner.tone === 'warn' && page.id !== 'approvals' ? <> <a href="#/approvals">Open Approvals</a></> : null}</span>
          </div>
        ) : null}
        <div className="page" key={page.id}><Page param={param} /></div>
      </main>
    </div>
  )
}
