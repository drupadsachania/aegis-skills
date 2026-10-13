import { useState } from 'react'
import { api, type KeyStatus, type ProviderId, type TestResult } from '../api'
import { ErrorBanner } from '../components/ErrorBanner'
import { Field } from '../components/Field'
import { StatusBadge } from '../components/StatusBadge'
import { errMsg, useLoad } from '../hooks'

type Tiers = { fast?: string; standard?: string; power?: string }
interface ProviderView {
  id: ProviderId; label: string; keyUrl: string | null; key: KeyStatus; models: Tiers | null
  local?: { preset: 'ollama' | 'lmstudio' | 'custom'; baseURL: string; model: string; toolCalling: 'supported' | 'unsupported' | 'unknown'; toolCallingCheckedAt: string | null }
}
interface ModelsView { defaultProvider: ProviderId | null; configured: ProviderId[]; presets: { ollama: string; lmstudio: string }; providers: ProviderView[] }

function TestLine({ r }: { r: TestResult | null }) {
  if (!r) return null
  return r.ok
    ? <p>OK · {r.latencyMs} ms{r.model ? ` · ${r.model}` : ''}{r.toolCalling ? ` · tool calling ${r.toolCalling}` : ''}</p>
    : <p className="error">Failed: {r.error ?? 'unknown error'}</p>
}

function CloudCard({ p, reload }: { p: ProviderView; reload: () => Promise<void> }) {
  const [key, setKey] = useState('')
  const [tiers, setTiers] = useState<Tiers>({})
  const [result, setResult] = useState<TestResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const run = async (fn: () => Promise<void>) => { try { await fn(); setError(null) } catch (e) { setError(errMsg(e)) } }
  const fromEnv = p.key.source === 'env'
  const tier = (t: keyof Tiers) => tiers[t] ?? p.models?.[t] ?? ''
  return (
    <div className="card">
      <h2>{p.label}</h2>
      <ErrorBanner error={error} />
      <p><StatusBadge value={p.key.status} /> {fromEnv ? 'from environment' : p.key.source === 'file' ? 'from key file' : ''} {p.key.masked ? <code>{p.key.masked}</code> : null}</p>
      {p.keyUrl ? <p><a href={p.keyUrl} target="_blank" rel="noreferrer noopener">Get a key</a></p> : null}
      <Field label="API key" hint={fromEnv ? `Set through ${p.key.envVar}; edit the environment to change it.` : 'Stored in your key file; never shown again.'}>
        <input type="password" autoComplete="off" value={key} disabled={fromEnv} onChange={(e) => setKey(e.target.value)} />
      </Field>
      <button className="primary" disabled={fromEnv || !key} onClick={() => { void run(async () => { await api.put(`/api/models/keys/${p.id}`, { key }); setKey(''); await reload() }) }}>Save key</button>
      <button disabled={fromEnv || p.key.status !== 'set'} onClick={() => { void run(async () => { await api.del(`/api/models/keys/${p.id}`); await reload() }) }}>Remove</button>
      <button onClick={() => { void run(async () => { setResult(null); setResult(await api.post<TestResult>(`/api/models/${p.id}/test`)) }) }}>Test</button>
      <TestLine r={result} />
      <h2>Model overrides</h2>
      <div className="row">
        {(['fast', 'standard', 'power'] as const).map((t) => (
          <Field key={t} label={t}><input type="text" value={tier(t)} onChange={(e) => setTiers({ ...tiers, [t]: e.target.value })} /></Field>
        ))}
      </div>
      <button onClick={() => { void run(async () => { await api.put('/api/models/config', { models: { [p.id]: { fast: tier('fast'), standard: tier('standard'), power: tier('power') } } }); await reload() }) }}>Save models</button>
    </div>
  )
}

function LocalCard({ p, presets, reload }: { p: ProviderView; presets: ModelsView['presets']; reload: () => Promise<void> }) {
  const l = p.local!
  const [preset, setPreset] = useState(l.preset)
  const [baseURL, setBaseURL] = useState(l.baseURL)
  const [model, setModel] = useState(l.model)
  const [key, setKey] = useState('')
  const [result, setResult] = useState<TestResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const run = async (fn: () => Promise<void>) => { try { await fn(); setError(null) } catch (e) { setError(errMsg(e)) } }
  const pick = (v: 'ollama' | 'lmstudio' | 'custom') => { setPreset(v); if (v !== 'custom') setBaseURL(presets[v]) }
  const save = async () => {
    await api.put('/api/models/config', { local: { preset, baseURL, model } })
    if (key) { await api.put('/api/models/keys/local', { key }); setKey('') }
    await reload()
  }
  return (
    <div className="card">
      <h2>{p.label}</h2>
      <ErrorBanner error={error} />
      <div className="row">
        <Field label="Preset">
          <select value={preset} onChange={(e) => pick(e.target.value as 'ollama' | 'lmstudio' | 'custom')}>
            <option value="ollama">Ollama</option><option value="lmstudio">LM Studio</option><option value="custom">Custom</option>
          </select>
        </Field>
        <Field label="Base URL"><input type="text" value={baseURL} onChange={(e) => { setBaseURL(e.target.value); setPreset('custom') }} /></Field>
      </div>
      <Field label="Model">
        <input type="text" list="local-models" value={model} onChange={(e) => setModel(e.target.value)} />
        <datalist id="local-models">{(result?.models ?? []).map((m) => <option key={m} value={m} />)}</datalist>
      </Field>
      <Field label="API key (optional)"><input type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} /></Field>
      <button className="primary" onClick={() => { void run(save) }}>Save</button>
      <button onClick={() => { void run(async () => { setResult(null); setResult(await api.post<TestResult>('/api/models/local/test')); await reload() }) }}>Test</button>
      <TestLine r={result} />
      <p>Tool calling: <StatusBadge value={l.toolCalling} /></p>
      <p className="muted">Without tool calling, sub-agents run without tools and external MCP tools are disabled.</p>
    </div>
  )
}

export function ModelsPage(_props: { param?: string }) {
  const m = useLoad<ModelsView>('/api/models')
  const [error, setError] = useState<string | null>(null)
  const reload = async () => { await m.reload() }
  const setDefault = async (v: string) => {
    try { await api.put('/api/models/config', { defaultProvider: v || null }); setError(null); await reload() } catch (e) { setError(errMsg(e)) }
  }
  return (
    <div>
      <h1>Models &amp; Keys</h1>
      <ErrorBanner error={error ?? m.error} />
      {m.loading || !m.data ? <p>Loading...</p> : (
        <>
          <Field label="Default provider">
            <select value={m.data.defaultProvider ?? ''} onChange={(e) => { void setDefault(e.target.value) }}>
              <option value="">None</option>
              {m.data.providers.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </Field>
          {m.data.providers.filter((p) => p.id !== 'local').map((p) => <CloudCard key={p.id} p={p} reload={reload} />)}
          {m.data.providers.filter((p) => p.id === 'local').map((p) => <LocalCard key={p.id} p={p} presets={m.data!.presets} reload={reload} />)}
        </>
      )}
    </div>
  )
}
