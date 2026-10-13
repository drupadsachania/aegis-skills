import path from 'node:path'
import { createGateway } from '@aegis-skills/themis-gateway'
import { loadMcpServers, openStore } from '@aegis-skills/themis-core'
import { ensureHome, loadConfig, updateConfig } from './config/config'
import { KeyStore } from './config/keys'
import { openAppDb } from './store/app-db'
import { SqliteCheckpointSaver } from './store/checkpointer'
import { ReportsRepo } from './store/reports'
import { RunEvents } from './runner/events'
import { Runner } from './runner/runner'
import { RunGateways } from './graph/run-gateways'
import type { StepContext } from './graph/steps'
import type { ToolMode } from './graph/skill-agent'
import { configuredProviders, resolveProvider, withProvider } from './providers/llm'
import { testConnection } from './providers/test-connection'
import type { ProviderId } from './providers/catalog'
import { listSkillInfo } from './skills/aegis'
import { readVersions } from './versions'
import { testMcpServer } from './mcp-test'
import { audit } from './pipelines/audit'
import { validateExposure } from './pipelines/exposure'
import type { AppDeps } from './server/deps'

export interface AppHandles { deps: AppDeps; runner: Runner; close(): void }

export function toolModeFor(provider: ProviderId): ToolMode {
  if (provider !== 'local') return 'tools'
  return loadConfig().local.toolCalling === 'supported' ? 'tools' : 'no-tools'
}

/** Opens ~/.themis (or $THEMIS_HOME) and wires every real dependency. */
export function createApp(): AppHandles {
  const p = ensureHome()
  const store = openStore(p.coreDb)
  const appDb = openAppDb(p.appDb)
  const reports = new ReportsRepo(appDb)
  const events = new RunEvents()
  const versions = readVersions()
  const gateways = new RunGateways(({ skill, runId }) =>
    createGateway({ skill, runId, store, servers: loadMcpServers(JSON.stringify(loadConfig().mcpServers)) }))
  const ctx: StepContext = { store, reports, events, gateways, toolMode: toolModeFor }
  const runner = new Runner({
    ctx,
    checkpointer: new SqliteCheckpointSaver(appDb),
    versions: () => versions,
    maxConcurrentRuns: () => loadConfig().limits.maxConcurrentRuns,
    resolveProvider,
  })
  const deps: AppDeps = {
    store, reports, events, runner, gateways,
    keys: new KeyStore(p.env),
    config: { load: loadConfig, update: updateConfig },
    paths: p,
    versions,
    skills: { list: listSkillInfo },
    configuredProviders,
    resolveProvider,
    testConnection,
    testMcpServer: (server) => testMcpServer(server, store),
    runAudit: (req, provider) => withProvider(provider, () => audit(req)),
    runExposure: (req, provider) => withProvider(provider, () => validateExposure(req)),
  }
  return { deps, runner, close: () => { store.close(); appDb.close() } }
}

/** dist/app.js -> dist/ui ; src/app.ts -> src/ui (absent: the server answers 503). */
export const defaultUiDir = (): string => path.join(__dirname, 'ui')
