'use strict'

const { stripFrontmatter, extractSection } = require('../../lib/skill-page')

const MD = '---\r\nname: x\r\n---\r\n# X\n\nIntro\n\n## Scope and authorization\n- Purpose: defend\n- Use only on systems you own or are explicitly authorized to assess.\n\n## Phases\nmore'

test('stripFrontmatter removes the YAML block (CRLF safe)', () => {
  expect(stripFrontmatter(MD).startsWith('# X')).toBe(true)
  expect(stripFrontmatter('# none')).toBe('# none')
})

test('extractSection returns the body up to the next h1/h2', () => {
  expect(extractSection(stripFrontmatter(MD), 'Scope and authorization'))
    .toBe('- Purpose: defend\n- Use only on systems you own or are explicitly authorized to assess.')
  expect(extractSection(MD, 'Missing')).toBeNull()
})
