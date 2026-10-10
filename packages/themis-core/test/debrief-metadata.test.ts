import { createHash } from 'node:crypto'
import { buildDebriefRecord, extractPatternTags } from '../src/debrief-metadata'

const res = (skill: string, confidence: 'high' | 'low') => ({
  subTaskId: `st-${skill}`, skill, findings: 'SECRET FINDINGS TEXT', confidence, guardrail: 'PASS' as const, inputTokens: 1, outputTokens: 1,
})

it('builds a metadata-only record with a non-reversible run id', () => {
  const now = 1700000000000
  const rec = buildDebriefRecord({
    task: 'Assess web app', environmentProfile: ['web'], skills: ['a', 'b'],
    results: [res('a', 'high'), res('b', 'low')], guardrailVerdicts: { passed: 1, flagged: 1, blocked: 0 }, durationMs: 42,
  }, now)
  expect(rec.runId).toBe(createHash('sha256').update('Assess web app' + now.toString()).digest('hex').slice(0, 16))
  expect(rec).toMatchObject({ skillConfidence: { a: 'high', b: 'low' }, controlGaps: 1, durationMs: 42, createdAt: '2023-11-14T22:13:20.000Z' })
  expect(JSON.stringify(rec)).not.toContain('SECRET FINDINGS TEXT')
  expect(JSON.stringify(rec)).not.toContain('Assess web app')
})
it('derives abstract pattern tags', () => {
  expect(extractPatternTags([res('a', 'high')], { passed: 1, flagged: 0, blocked: 0 })).toEqual(['skill:a', 'all-passed'])
  expect(extractPatternTags([res('a', 'low')], { passed: 0, flagged: 1, blocked: 1 })).toEqual(['skill:a', 'low-confidence', 'flagged', 'blocked'])
})
