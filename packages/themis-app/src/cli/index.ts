import { parseArgs } from 'node:util'
import { spawn } from 'node:child_process'
import readline from 'node:readline'
import { ProviderUnavailableError, ValidationError } from '@aegis-skills/themis-core'
import { createApp, defaultUiDir } from '../app'
import { createDashboardServer } from '../server/http'
import { isLoopback } from '../server/security'
import { ConfigError, getConfigValue, loadConfig, setConfigValue } from '../config/config'
import { KeyError, KeyStore } from '../config/keys'
import { PROVIDER_ORDER, isProviderId } from '../providers/catalog'
import { testConnection } from '../providers/test-connection'
import { ownVersion, readVersions } from '../versions'

const out = (s: string): void => { process.stdout.write(s + '\n') }
const err = (s: string): void => { process.stderr.write(s + '\n') }

export const HELP = `themis - local security-operations agent (Themis + the Aegis skill pack)

Usage:
  themis dashboard [--port 9120] [--host 127.0.0.1] [--allow-host <name>] [--no-open]
  themis run "<task>" [--provider anthropic|openai|google|local] [--env a,b] [--tags x,y] [--json]
  themis config get [key]
  themis config set <key> <value>
  themis keys [list]
  themis keys set <provider> [--stdin]
  themis keys unset <provider>
  themis keys test <provider>
  themis --version | --help

Data lives in ~/.themis (override with THEMIS_HOME).`

export async function main(argv: string[]): Promise<number> {
  const [cmd, ...rest] = argv
  try {
    switch (cmd) {
      case undefined: case 'help': case '--help': case '-h': out(HELP); return 0
      case '--version': case '-v': return cmdVersion()
      case 'dashboard': return await cmdDashboard(rest)
      case 'run': return await cmdRun(rest)
      case 'config': return cmdConfig(rest)
      case 'keys': return await cmdKeys(rest)
      default: err(`Unknown command: ${cmd}\n\n${HELP}`); return 2
    }
  } catch (e) {
    err(describeError(e))
    return 1
  }
}

function describeError(e: unknown): string {
  if (e instanceof ProviderUnavailableError) return 'No AI provider is configured. Run "themis keys set anthropic" (or openai/google), or set a local model in the dashboard (Models & Keys).'
  if (e instanceof ValidationError) return `Invalid input: ${e.message}`
  if (e instanceof ConfigError || e instanceof KeyError) return e.message
  if (e instanceof Error && /EADDRINUSE/.test(e.message)) return 'That port is already in use. Pass --port <1024-65535>.'
  return e instanceof Error ? e.message : String(e)
}

function cmdVersion(): number {
  const v = readVersions()
  out(`themis ${ownVersion()} (Aegis ${v.aegis}, osk ${v.osk})`)
  return 0
}

const csv = (s: string | undefined): string[] => (s ? s.split(',').map((x) => x.trim()).filter(Boolean) : [])

function openBrowser(url: string): void {
  const [command, args] = process.platform === 'win32' ? ['rundll32', ['url.dll,FileProtocolHandler', url]]
    : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]]
  try {
    const child = spawn(command as string, args as string[], { stdio: 'ignore', detached: true })
    child.on('error', () => err(`Could not open a browser. Open this URL yourself: ${url}`))
    child.unref()
  } catch { err(`Could not open a browser. Open this URL yourself: ${url}`) }
}

async function cmdDashboard(args: string[]): Promise<number> {
  const { values } = parseArgs({
    args, allowPositionals: false, strict: true,
    options: { port: { type: 'string' }, host: { type: 'string' }, 'allow-host': { type: 'string', multiple: true }, 'no-open': { type: 'boolean', default: false } },
  })
  const port = values.port !== undefined ? Number(values.port) : loadConfig().dashboard.port
  if (!Number.isInteger(port) || port < 1024 || port > 65535) { err('--port must be an integer from 1024 to 65535'); return 2 }
  const host = values.host ?? '127.0.0.1'
  if (!isLoopback(host)) {
    err(`WARNING: binding ${host} exposes the dashboard beyond this machine over plain HTTP.`)
    err('Anyone who obtains the session link can run tasks and approve actions. Prefer the default 127.0.0.1.')
  }
  const app = createApp()
  try {
    const dash = await createDashboardServer({ host, port, deps: app.deps, uiDir: defaultUiDir(), allowHosts: values['allow-host'] ?? [], allowNonLoopback: values.host !== undefined })
    const v = app.deps.versions
    out(`Themis ${v.themis} · Aegis ${v.aegis} (osk ${v.osk}) · data: ${app.deps.paths.home}`)
    out(`Dashboard: ${dash.url}`)
    out('This link carries a session token for this launch only. Do not share it. Press Ctrl+C to stop.')
    if (!values['no-open']) openBrowser(dash.url)
    await new Promise<void>((resolve) => { process.once('SIGINT', resolve); process.once('SIGTERM', resolve) })
    await dash.close()
    return 0
  } finally {
    app.close()
  }
}

async function cmdRun(args: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args, allowPositionals: true, strict: true,
    options: { provider: { type: 'string' }, env: { type: 'string' }, tags: { type: 'string' }, json: { type: 'boolean', default: false } },
  })
  const task = positionals.join(' ').trim()
  if (!task) { err('Usage: themis run "<task>"'); return 2 }
  const app = createApp()
  try {
    const { runId, done } = app.runner.start({ task, provider: values.provider, context: { environments: csv(values.env), attackSurfaceTags: csv(values.tags) } })
    err(`Run ${runId} started`)
    const stop = app.deps.events.subscribe(runId, ({ event: e }) => {
      if (e.type === 'step') err(`  ${e.status === 'started' ? '->' : e.status === 'error' ? 'x' : 'ok'} ${e.step}`)
      if (e.type === 'subtask') err(`    ${e.status === 'started' ? '->' : 'ok'} ${e.skill} (${e.subTaskId})`)
      if (e.type === 'notice') err(`  ! ${e.message}`)
    })
    const run = await done
    stop()
    if (run.status === 'awaiting_approval') {
      err(`Run ${runId} is waiting for a human decision. Start "themis dashboard" and open Approvals; the run resumes after you decide.`)
      return 3
    }
    if (run.status !== 'completed') { err(`Run ${runId} failed: ${run.error ?? 'unknown error'}`); return 1 }
    const report = app.deps.reports.get(runId)
    out(values.json ? JSON.stringify(report?.body ?? null, null, 2) : report?.markdown ?? '')
    return 0
  } finally {
    app.close()
  }
}

function cmdConfig(args: string[]): number {
  const [sub, key, ...value] = args
  if (sub === 'get') {
    const cfg = loadConfig()
    const v = key ? getConfigValue(cfg, key) : cfg
    if (v === undefined) { err(`Unknown key: ${key}`); return 2 }
    out(JSON.stringify(v, null, 2))
    return 0
  }
  if (sub === 'set' && key && value.length > 0) { setConfigValue(key, value.join(' ')); out(`Set ${key}`); return 0 }
  err('Usage: themis config get [key] | themis config set <key> <value>')
  return 2
}

function readStdin(limit = 8192): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (c: string) => { data += c; if (data.length > limit) reject(new KeyError('Input too long')) })
    process.stdin.on('end', () => resolve(data.trim()))
    process.stdin.on('error', reject)
  })
}

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) { reject(new KeyError('No terminal: pipe the key with --stdin')); return }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    let muted = false
    ;(rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => { if (!muted) process.stdout.write(s) }
    rl.question(question, (answer) => { rl.close(); process.stdout.write('\n'); resolve(answer.trim()) })
    muted = true
  })
}

async function cmdKeys(args: string[]): Promise<number> {
  const [sub = 'list', provider, ...flags] = args
  const keys = new KeyStore()
  if (sub === 'list') {
    for (const p of PROVIDER_ORDER) {
      const s = keys.status(p)
      out(`${p.padEnd(10)} ${s.status.padEnd(8)} ${s.masked ?? ''}${s.source === 'env' ? '  (from environment)' : ''}`)
    }
    return 0
  }
  if (!isProviderId(provider)) { err(`Provider must be one of: ${PROVIDER_ORDER.join(', ')}`); return 2 }
  if (sub === 'set') {
    const value = flags.includes('--stdin') ? await readStdin() : await promptHidden(`${provider} API key: `)
    const s = keys.set(provider, value)
    out(`Saved ${s.envVar} (${s.masked}) to ${keys.file}`)
    return 0
  }
  if (sub === 'unset') { keys.unset(provider); out(`Removed the ${provider} key from ${keys.file}`); return 0 }
  if (sub === 'test') {
    const r = await testConnection(provider)
    out(r.ok ? `OK ${r.model ?? ''} ${r.latencyMs}ms${r.toolCalling ? ` tools:${r.toolCalling}` : ''}` : `FAILED: ${r.error ?? 'unknown error'}`)
    return r.ok ? 0 : 1
  }
  err('Usage: themis keys [list] | set <provider> [--stdin] | unset <provider> | test <provider>')
  return 2
}
