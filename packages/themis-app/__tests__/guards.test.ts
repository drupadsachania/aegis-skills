import fs from 'node:fs'
import path from 'node:path'

const SRC = path.join(__dirname, '..', 'src')
const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]))
const files = walk(SRC).filter((f) => /\.tsx?$/.test(f))
const rel = (f: string): string => path.relative(SRC, f).split(path.sep).join('/')
const text = (f: string): string => fs.readFileSync(f, 'utf8')
const importRe = (pkg: string): RegExp => new RegExp(`(?:from\\s+|require\\(\\s*|import\\(\\s*)['"]${pkg}(?:/[^'"]*)?['"]`)

describe('themis-app source guards', () => {
  it('only providers/models.ts imports the chat-model provider SDKs', () => {
    const re = /(?:from\s+|require\(\s*|import\(\s*)['"]@langchain\/(?:anthropic|openai|google-genai)['"]/
    for (const f of files) if (rel(f) !== 'providers/models.ts') expect([rel(f), re.test(text(f))]).toEqual([rel(f), false])
  })

  it('imports no forbidden packages', () => {
    for (const pkg of ['better-sqlite3', '@supabase/supabase-js', 'express', 'next', 'openai']) {
      for (const f of files) expect([rel(f), pkg, importRe(pkg).test(text(f))]).toEqual([rel(f), pkg, false])
    }
  })

  it('references node:sqlite only as a type or through getBuiltinModule', () => {
    for (const f of files) {
      for (const line of text(f).split('\n')) {
        if (!line.includes('node:sqlite')) continue
        const t = line.trim()
        if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) continue
        const ok = /^import type\b/.test(t) || /typeof import\(['"]node:sqlite['"]\)/.test(t) || /getBuiltinModule\(['"]node:sqlite['"]\)/.test(t) || /Node\.js|unavailable/.test(t)
        expect([rel(f), t, ok]).toEqual([rel(f), t, true])
      }
    }
  })

  it('never sets an Access-Control- header in the server', () => {
    for (const f of files.filter((x) => rel(x).startsWith('server/'))) expect([rel(f), /access-control-/i.test(text(f))]).toEqual([rel(f), false])
  })

  it('keeps decideApproval out of graph, runner, reasoning and pipelines', () => {
    for (const f of files.filter((x) => /^(graph|runner|reasoning|pipelines)\//.test(rel(x)))) {
      expect([rel(f), text(f).includes('decideApproval')]).toEqual([rel(f), false])
    }
  })
})
