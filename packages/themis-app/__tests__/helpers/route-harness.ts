import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { makeTestDeps, startTestServer } from './test-deps'
import { request, authed, type ReqOpts, type Resp } from './http-client'
import type { AppDeps } from '../../src/server/deps'
import type { Dashboard } from '../../src/server/http'

export interface Harness {
  deps: AppDeps
  dash: Dashboard
  call(method: string, p: string, o?: ReqOpts): Promise<Resp>
  close(): Promise<void>
}

/** Starts an authenticated test server; the caller wraps it in beforeEach/afterEach. */
export async function startHarness(over: Partial<AppDeps> = {}): Promise<Harness> {
  const ui = fs.mkdtempSync(path.join(os.tmpdir(), 'themis-ui-'))
  const deps = makeTestDeps(over)
  const dash = await startTestServer(deps, ui)
  return {
    deps, dash,
    call: (method, p, o = {}) => request(dash.port, method, p, { ...o, headers: { ...authed(dash.port, dash.token), ...o.headers } }),
    close: async () => { await dash.close(); fs.rmSync(ui, { recursive: true, force: true }) },
  }
}
