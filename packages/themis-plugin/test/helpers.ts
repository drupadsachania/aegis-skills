import { createThemisMcpServer } from '../src/server'
import { buildDeps, type PluginDeps } from '../src/deps'

export const SLUGS = ['attack-surface-mapping', 'threat-modeling', 'exposure-validation']

export function setup(over: Partial<PluginDeps> = {}) {
  const deps = Object.assign(buildDeps({ storePath: ':memory:', skillSlugs: SLUGS }), over)
  const server = createThemisMcpServer(deps)
  return { deps, server }
}

// Invoke a registered tool's handler directly (no transport; SDK 1.31 stores it as `handler`).
export function tool(server: unknown, name: string) {
  const t = (server as { _registeredTools: Record<string, { handler: (a: unknown, x: unknown) => Promise<unknown> }> })._registeredTools[name]
  if (!t) throw new Error('no tool ' + name)
  return (args: unknown, extra: unknown = {}) => t.handler(args, extra)
}

export const parse = (r: unknown) => JSON.parse((r as { content: { text: string }[] }).content[0].text)

/** Drive a run to the fanout pause with one sub-task s1. */
export async function toFanout(server: unknown, task = 'assess the external perimeter') {
  const r = parse(await tool(server, 'themis_start_run')({ task }))
  const d = parse(await tool(server, 'themis_submit_step')({
    runId: r.runId, step: 'decompose',
    output: { subTasks: [{ id: 's1', skill: 'attack-surface-mapping', description: 'enumerate hosts' }] },
  }))
  return { runId: r.runId as string, afterDecompose: d }
}
