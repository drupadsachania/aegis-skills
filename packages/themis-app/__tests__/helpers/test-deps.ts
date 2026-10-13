import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { BaseMessage } from '@langchain/core/messages'
import { createMemoryStore } from '@aegis-skills/themis-core'
import type { AppDeps } from '../../src/server/deps'
import { createDashboardServer, type Dashboard } from '../../src/server/http'
import { openAppDb } from '../../src/store/app-db'
import { ReportsRepo } from '../../src/store/reports'
import { RunEvents } from '../../src/runner/events'
import { KeyStore } from '../../src/config/keys'
import { loadConfig, updateConfig, paths } from '../../src/config/config'
import { contentOf, hasToolResult, systemText, text, toolCall, type Script } from './scripted-model'

export interface ScriptOptions {
  plan: Array<{ id: string; description: string; skill: string; phase: number; dependsOn: string[] }>
  /** Sub-agents whose task description matches call this tool once. */
  toolCall?: { when: RegExp; name: string; args: Record<string, unknown> }
  failAgentsWith?: Error
}

/** Routes by system prompt: decompose → plan, skill agent → findings/tool call, guardrail → PASS, else report. */
export function standardScript(o: ScriptOptions): Script {
  return (messages: BaseMessage[]) => {
    const sys = systemText(messages)
    const human = contentOf([...messages].reverse().find((m) => m._getType() === 'human'))
    if (/observe-and-recommend/.test(sys)) {
      if (o.failAgentsWith) throw o.failAgentsWith
      if (o.toolCall && o.toolCall.when.test(human) && !hasToolResult(messages) && !/<methodology>/.test(human)) {
        return toolCall(o.toolCall.name, o.toolCall.args)
      }
      return text(`FINDINGS: ${(/<sub_task>\n([^\n]*)/.exec(human)?.[1] ?? 'none').slice(0, 60)}`)
    }
    if (/guardrail/i.test(sys)) return text('{"verdict":"PASS"}')
    if (/planner|decompos/i.test(sys)) return text(JSON.stringify(o.plan))
    return text('REPORT: synthesised findings')
  }
}

/** Real stores and config (THEMIS_HOME must point at a temp dir); fakes for the runner and network calls. */
export function makeTestDeps(over: Partial<AppDeps> = {}): AppDeps {
  const store = createMemoryStore()
  return {
    store,
    reports: new ReportsRepo(openAppDb(':memory:')),
    events: new RunEvents(),
    runner: {
      start: jest.fn(() => ({ runId: 'run-test', done: Promise.resolve(store.getRun('run-test') as never) })),
      resume: jest.fn(async () => ({ done: Promise.resolve(null as never) })),
      isActive: jest.fn(() => false),
    },
    gateways: { holdsArgs: () => true },
    keys: new KeyStore(),
    config: { load: loadConfig, update: updateConfig },
    paths: paths(),
    versions: { themis: '0.1.0', aegis: '1.1.0', osk: '1.1' },
    skills: { list: () => [] },
    configuredProviders: () => ['anthropic'],
    resolveProvider: () => 'anthropic',
    testConnection: jest.fn(async (p) => ({ ok: true, provider: p, model: 'm', latencyMs: 1 })),
    testMcpServer: jest.fn(async () => ({ ok: true, tools: [] })),
    runAudit: jest.fn(),
    runExposure: jest.fn(),
    ...over,
  }
}

export async function startTestServer(deps: AppDeps, uiDir = fs.mkdtempSync(path.join(os.tmpdir(), 'themis-ui-'))): Promise<Dashboard> {
  return createDashboardServer({ host: '127.0.0.1', port: 0, deps, uiDir, token: 'test-token-0123456789abcdefghijklmnopqrstuv' })
}
