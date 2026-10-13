import type { AuditReport, AuditRequest, ExposureReport, ExposureRequest, McpServerConfig, ThemisStore, VersionStamp } from '@aegis-skills/themis-core'
import type { ReportsRepo } from '../store/reports'
import type { RunEvents } from '../runner/events'
import type { Runner } from '../runner/runner'
import type { RunGateways } from '../graph/run-gateways'
import type { KeyStore } from '../config/keys'
import type { Paths, ThemisConfig } from '../config/config'
import type { SkillInfo } from '../skills/aegis'
import type { ProviderId } from '../providers/catalog'
import type { TestResult } from '../providers/test-connection'

export interface McpTestResult { ok: boolean; tools: Array<{ name: string; toolClass: string; disposition: string }>; error?: string }

/** Everything a route may touch. Tests pass fakes; app.ts wires the real ones. */
export interface AppDeps {
  store: ThemisStore
  reports: ReportsRepo
  events: RunEvents
  runner: Pick<Runner, 'start' | 'resume' | 'isActive'>
  gateways: Pick<RunGateways, 'holdsArgs'>
  keys: KeyStore
  config: { load(): ThemisConfig; update(fn: (c: ThemisConfig) => ThemisConfig | void): ThemisConfig }
  paths: Paths
  versions: VersionStamp
  skills: { list(): SkillInfo[] }
  configuredProviders(): ProviderId[]
  resolveProvider(requested?: string): ProviderId
  testConnection(provider: ProviderId): Promise<TestResult>
  testMcpServer(server: McpServerConfig): Promise<McpTestResult>
  runAudit(req: AuditRequest, provider: ProviderId): Promise<AuditReport>
  runExposure(req: ExposureRequest, provider: ProviderId): Promise<ExposureReport>
}
