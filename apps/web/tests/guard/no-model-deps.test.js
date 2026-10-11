'use strict'

const fs = require('fs')
const path = require('path')

const WEB = path.resolve(__dirname, '..', '..')
const FORBIDDEN = [/^@anthropic-ai\//, /^openai$/, /^@google\/generative-ai$/, /^@google\/genai$/,
  /^@langchain\//, /^langsmith$/, /^better-sqlite3$/, /^@types\/better-sqlite3$/, /^@supabase\//, /^ai$/]
const SOURCE_DIRS = ['pages', 'app', 'components', 'lib', 'scripts']
const REMOVED_ROUTES = ['/api/themis', '/api/audit', '/api/exposure', '/invoke']
// TEMPORARY: these pages are rewritten in Phase 5 Tasks 13-15 and still carry prose that
// mentions removed routes. Delete this list when they are rewritten.
const PENDING_REWRITE = ['pages/docs.js', 'pages/themis.js']

function walk (dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.(js|ts|tsx)$/.test(e.name)) out.push(p)
  }
  return out
}
const files = SOURCE_DIRS.flatMap(d => walk(path.join(WEB, d)))
const isForbidden = spec => FORBIDDEN.some(rx => rx.test(spec))
const rel = f => path.relative(WEB, f).split(path.sep).join('/')

describe('website has no model, LLM-framework, sqlite or Supabase code', () => {
  test('package.json declares none of them', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(WEB, 'package.json'), 'utf8'))
    const names = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })
    expect(names.filter(isForbidden)).toEqual([])
  })

  test('no source file imports them', () => {
    const offenders = []
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8')
      for (const m of src.matchAll(/(?:require\(|from\s+|import\()\s*['"]([^'"]+)['"]/g)) {
        if (isForbidden(m[1])) offenders.push(`${rel(f)} -> ${m[1]}`)
      }
    }
    expect(offenders).toEqual([])
  })

  test('no source file reads secrets from the environment', () => {
    const offenders = files.filter(f => /process\.env\.(?!NODE_ENV\b)[A-Z_]+/.test(fs.readFileSync(f, 'utf8')))
    expect(offenders.map(rel)).toEqual([])
  })

  test('no source file references a removed route', () => {
    const offenders = []
    for (const f of files) {
      if (PENDING_REWRITE.includes(rel(f))) continue
      const src = fs.readFileSync(f, 'utf8')
      for (const r of REMOVED_ROUTES) if (src.includes(r)) offenders.push(`${rel(f)} -> ${r}`)
    }
    expect(offenders).toEqual([])
  })

  test('next.config.js has no serverExternalPackages', () => {
    expect(fs.readFileSync(path.join(WEB, 'next.config.js'), 'utf8')).not.toMatch(/serverExternalPackages/)
  })

  test('the removed routes, telemetry and health endpoint do not exist', () => {
    for (const p of ['pages/api/health.js', 'pages/api/[skill]/invoke.js', 'lib/telemetry.js', 'supabase', 'app/api/themis']) {
      expect(fs.existsSync(path.join(WEB, p))).toBe(false)
    }
  })
})
