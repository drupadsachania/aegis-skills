import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// Use a temp directory so tests don't pollute data/themis.db
const TEST_DB_DIR = path.join(os.tmpdir(), `themis-test-${Date.now()}`)
const TEST_DB_PATH = path.join(TEST_DB_DIR, 'themis.db')

const ORIG_ENV = process.env

beforeEach(() => {
  process.env = { ...ORIG_ENV, THEMIS_DB_PATH: TEST_DB_PATH }
  jest.resetModules()
})

afterEach(() => {
  process.env = ORIG_ENV
  // Clean up test DB
  try {
    const { closeDb } = require('@/lib/themis/debrief')
    closeDb()
  } catch { /* ignore */ }
  try { fs.rmSync(TEST_DB_DIR, { recursive: true, force: true }) } catch { /* ignore */ }
})

const mockResult = (skill: string, confidence: 'high' | 'medium' | 'low' = 'high') => ({
  subTaskId: `st-${skill}`,
  skill,
  findings: 'findings text — must NOT appear in DB',
  confidence,
  guardrail: 'PASS' as const,
  inputTokens: 10,
  outputTokens: 20,
})

describe('writeDebrief', () => {
  it('creates the data directory and database file', () => {
    const { writeDebrief } = require('@/lib/themis/debrief')
    writeDebrief({
      task: 'Assess web app',
      environmentProfile: ['web'],
      skills: ['mitre-attack'],
      results: [mockResult('mitre-attack')],
      guardrailVerdicts: { passed: 1, flagged: 0, blocked: 0 },
      durationMs: 500,
    })
    expect(fs.existsSync(TEST_DB_PATH)).toBe(true)
  })

  it('writes a row to themis_debrief table', () => {
    const Database = require('better-sqlite3')
    const { writeDebrief } = require('@/lib/themis/debrief')
    writeDebrief({
      task: 'Assess web app',
      environmentProfile: ['web', 'api'],
      skills: ['mitre-attack', 'threat-modeling'],
      results: [mockResult('mitre-attack'), mockResult('threat-modeling')],
      guardrailVerdicts: { passed: 2, flagged: 0, blocked: 0 },
      durationMs: 750,
    })
    const db = new Database(TEST_DB_PATH)
    const row = db.prepare('SELECT * FROM themis_debrief').get()
    db.close()
    expect(row).toBeDefined()
    expect(JSON.parse(row.skills_executed)).toContain('mitre-attack')
    expect(row.duration_ms).toBe(750)
  })

  it('NEVER stores findings text in the database', () => {
    const Database = require('better-sqlite3')
    const { writeDebrief } = require('@/lib/themis/debrief')
    writeDebrief({
      task: 'Assess web app',
      environmentProfile: ['web'],
      skills: ['mitre-attack'],
      results: [mockResult('mitre-attack')],
      guardrailVerdicts: { passed: 1, flagged: 0, blocked: 0 },
      durationMs: 300,
    })
    const db = new Database(TEST_DB_PATH)
    const row = db.prepare('SELECT * FROM themis_debrief').get()
    db.close()
    const rowJson = JSON.stringify(row)
    expect(rowJson).not.toContain('findings text — must NOT appear in DB')
    expect(rowJson).not.toContain('Assess web app')
  })

  it('NEVER stores task content (raw task string) in the database', () => {
    const Database = require('better-sqlite3')
    const { writeDebrief } = require('@/lib/themis/debrief')
    const secretTask = 'TOP SECRET: assess payment gateway CVE-2024-99999'
    writeDebrief({
      task: secretTask,
      environmentProfile: ['fintech'],
      skills: ['mitre-attack'],
      results: [mockResult('mitre-attack')],
      guardrailVerdicts: { passed: 1, flagged: 0, blocked: 0 },
      durationMs: 200,
    })
    const db = new Database(TEST_DB_PATH)
    const row = db.prepare('SELECT * FROM themis_debrief').get()
    db.close()
    expect(JSON.stringify(row)).not.toContain(secretTask)
    expect(JSON.stringify(row)).not.toContain('CVE-2024-99999')
  })

  it('stores guardrail verdict counts correctly', () => {
    const Database = require('better-sqlite3')
    const { writeDebrief } = require('@/lib/themis/debrief')
    writeDebrief({
      task: 'task',
      environmentProfile: [],
      skills: ['mitre-attack'],
      results: [mockResult('mitre-attack')],
      guardrailVerdicts: { passed: 1, flagged: 2, blocked: 1 },
      durationMs: 100,
    })
    const db = new Database(TEST_DB_PATH)
    const row = db.prepare('SELECT * FROM themis_debrief').get()
    db.close()
    const verdicts = JSON.parse(row.guardrail_verdicts)
    expect(verdicts.passed).toBe(1)
    expect(verdicts.flagged).toBe(2)
    expect(verdicts.blocked).toBe(1)
  })

  it('does not throw when DB write fails (swallows errors)', () => {
    const { writeDebrief } = require('@/lib/themis/debrief')
    // Set an invalid path that can't be written to
    process.env.THEMIS_DB_PATH = '/dev/null/impossible/path/themis.db'
    expect(() =>
      writeDebrief({
        task: 'task',
        environmentProfile: [],
        skills: [],
        results: [],
        guardrailVerdicts: { passed: 0, flagged: 0, blocked: 0 },
        durationMs: 0,
      })
    ).not.toThrow()
  })
})
