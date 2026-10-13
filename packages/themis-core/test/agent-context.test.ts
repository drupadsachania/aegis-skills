import { validatePhaseContent, formatFindings, MAX_PHASE_CONTENT_CHARS } from '../src/agent-context'

const r = (skill: string, id: string) => ({ skill, subTaskId: id, confidence: 'high' as const, findings: `f-${id}` })

it('accepts normal methodology text', () => { expect(validatePhaseContent('## Phase\nCheck data: classification')).toBe(true) })
it('rejects oversize or script-bearing content', () => {
  expect(validatePhaseContent('a'.repeat(MAX_PHASE_CONTENT_CHARS + 1))).toBe(false)
  for (const bad of ['<script>', 'javascript:x', 'data:text/html', 'eval(1)']) expect(validatePhaseContent(bad)).toBe(false)
})
it('formats findings, optionally filtered by skill', () => {
  expect(formatFindings([r('a', '1'), r('b', '2')], 'b')).toBe('[b / 2] (confidence: high)\nf-2')
  expect(formatFindings([r('a', '1'), r('b', '2')], '')).toBe('[a / 1] (confidence: high)\nf-1\n\n---\n\n[b / 2] (confidence: high)\nf-2')
})
it('says when nothing is available', () => {
  expect(formatFindings([], 'x')).toBe('No findings available for skill "x" yet.')
  expect(formatFindings([], '')).toBe('No findings available yet.')
})
