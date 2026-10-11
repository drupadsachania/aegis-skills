'use strict'

// Pins the facts that docs/trust/data-flow.md and the /trust page state, by reading the source
// they cite. If code changes so that a sentence on the trust page stops being true, a test here
// fails and the page must be updated with it. Static source checks only; nothing is executed.
const fs = require('fs')
const path = require('path')

const REPO = path.resolve(__dirname, '..', '..', '..', '..')
const read = p => fs.readFileSync(path.join(REPO, p), 'utf8')
const exists = p => fs.existsSync(path.join(REPO, p))

function walk (dir, exts = /\.(ts|tsx|js)$/) {
  const abs = path.join(REPO, dir)
  if (!fs.existsSync(abs)) return []
  const out = []
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`
    if (e.isDirectory()) { if (!['node_modules', 'dist', '.next', 'ui'].includes(e.name)) out.push(...walk(rel, exts)) } else if (exts.test(e.name)) out.push(rel)
  }
  return out
}

const NETWORK = /\bfetch\(|require\(['"](?:node:)?(?:https?|net|tls|dgram)['"]\)|from ['"](?:node:)?(?:https?|net|tls|dgram)['"]/
const offenders = (files, re) => files.filter(f => re.test(read(f)))

describe('what contacts the network', () => {
  test('the Aegis CLI, library and MCP server contain no network calls', () => {
    const files = [...walk('packages/aegis/cli'), ...walk('packages/aegis/lib'), ...walk('packages/aegis/mcp')]
    expect(files.length).toBeGreaterThan(5)
    expect(offenders(files, NETWORK)).toEqual([])
  })

  test('the hosted MCP route and its rate limiter make no outbound calls', () => {
    expect(offenders(['apps/web/app/api/mcp/route.ts', 'apps/web/lib/rate-limit.ts'], NETWORK)).toEqual([])
  })

  test('themis-core, themis-gateway and the plugin make no direct network calls', () => {
    const files = [...walk('packages/themis-core/src'), ...walk('packages/themis-gateway/src'), ...walk('packages/themis-plugin/src')]
    expect(offenders(files, NETWORK)).toEqual([])
  })

  test('in the standalone app only the test-connection file calls fetch', () => {
    const files = walk('packages/themis-app/src')
    expect(files.filter(f => /\bfetch\(/.test(read(f)))).toEqual(['packages/themis-app/src/providers/test-connection.ts'])
  })

  test('the plugin depends on no model SDK', () => {
    const pkg = JSON.parse(read('packages/themis-plugin/package.json'))
    expect(Object.keys(pkg.dependencies).filter(n => /langchain|openai|anthropic|@google\//.test(n))).toEqual([])
  })

  test('the page policy allows only the site origin plus the font service', () => {
    const cfg = read('apps/web/next.config.js')
    expect(cfg).toContain(`"default-src 'self'"`)
    expect(cfg).toContain(`"connect-src 'self'"`)
    expect(cfg).toContain(`"img-src 'self' data:"`)
    expect(cfg).toContain(`"frame-ancestors 'none'"`)
  })
})

describe('telemetry', () => {
  const SRC = [...walk('packages/themis-core/src'), ...walk('packages/themis-gateway/src'), ...walk('packages/themis-plugin/src'),
    ...walk('packages/themis-app/src'), ...walk('packages/aegis/cli'), ...walk('packages/aegis/lib'), ...walk('packages/aegis/mcp'),
    ...walk('apps/web/pages'), ...walk('apps/web/components'), ...walk('apps/web/lib'), ...walk('apps/web/app')]

  test('no analytics, tracking or crash-reporting library is referenced', () => {
    expect(offenders(SRC, /posthog|sentry|mixpanel|segment\.io|amplitude|google-analytics|gtag\(|plausible|datadog|applicationinsights|opentelemetry/i)).toEqual([])
  })

  test('the app never sets LangChain tracing variables', () => {
    expect(offenders(walk('packages/themis-app/src'), /LANGSMITH|LANGCHAIN_TRACING/)).toEqual([])
  })
})

describe('credentials', () => {
  test('keys live in ~/.themis/.env, written 0600 into a 0700 folder', () => {
    const cfg = read('packages/themis-app/src/config/config.ts')
    expect(cfg).toMatch(/env: path\.join\(home, '\.env'\)/)
    expect(cfg).toContain('mode: 0o700')
    expect(cfg).toContain('mode: 0o600')
    expect(read('packages/themis-core/src/store/home.ts')).toContain(`path.join(os.homedir(), '.themis')`)
  })

  test('a key is only ever shown as its first 3 and last 4 characters, and short keys are fully masked', () => {
    const keys = read('packages/themis-app/src/config/keys.ts')
    expect(keys).toContain(`value.length <= 8 ? '••••'`)
    expect(keys).toContain('value.slice(0, 3)')
    expect(keys).toContain('value.slice(-4)')
    expect(read('packages/themis-app/src/server/routes/models.ts')).toContain('only the masked status')
  })

  test('the environment wins over the key file', () => {
    expect(read('packages/themis-app/src/config/keys.ts')).toMatch(/return fromEnv \|\| readEnvFile\(this\.file\)\.get/)
  })

  test('MCP server header values are masked by the dashboard API', () => {
    expect(read('packages/themis-app/src/server/routes/mcp.ts')).toContain(`const MASK = '••••'`)
  })
})

describe('approval boundary', () => {
  test('only the two human channels (and the store implementations) call decideApproval', () => {
    const callers = [...walk('packages/themis-core/src'), ...walk('packages/themis-gateway/src'), ...walk('packages/themis-plugin/src'), ...walk('packages/themis-app/src')]
      .filter(f => /\.decideApproval\(/.test(read(f)))
    expect(callers.sort()).toEqual(['packages/themis-app/src/server/routes/approvals.ts', 'packages/themis-plugin/src/approval.ts'])
  })

  test('the gateway executes only after canExecuteApproval and never decides', () => {
    const gw = read('packages/themis-gateway/src/gateway.ts')
    expect(gw).toContain('canExecuteApproval(a)')
    expect(gw).not.toMatch(/decideApproval\(/)
    const core = read('packages/themis-core/src/approvals.ts')
    expect(core).toContain(`a.status !== 'approved'`)
    expect(core).toContain(`a.decidedBy !== 'human'`)
  })

  test('an unmarked tool is classified as a write (default deny)', () => {
    expect(read('packages/themis-core/src/mcp/tool-policy.ts')).toMatch(/default-deny for autonomy\)\.\s+return 'write'/)
  })

  test('the plugin never falls through to execution when elicitation fails', () => {
    const src = read('packages/themis-plugin/src/tools/gateway-tools.ts')
    expect(src).toContain('human_handoff')
    expect(src).toContain('Never execute')
    expect(src).not.toMatch(/\.createMessage\(/)
  })
})

describe('local layout', () => {
  test('themis.db and app.db live under the Themis home and config.json beside them', () => {
    const cfg = read('packages/themis-app/src/config/config.ts')
    for (const f of ['themis.db', 'app.db', 'config.json']) expect(cfg).toContain(`'${f}'`)
    expect(exists('packages/aegis/lib/ledger.js') && read('packages/aegis/lib/ledger.js')).toContain('installed.json')
  })
})
