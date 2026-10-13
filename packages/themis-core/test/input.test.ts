import { sanitiseUntrustedInput, withRedactionWarning, REDACTION_WARNING } from '../src/input'
import { ValidationError } from '../src/types'

describe('sanitiseUntrustedInput', () => {
  it('strips control characters but keeps newlines and tabs', () => {
    expect(sanitiseUntrustedInput('a\x00b\nc\td\x7F', 'Audit input')).toBe('ab\nc\td')
  })
  it('rejects input over the limit with a labelled message', () => {
    expect(() => sanitiseUntrustedInput('a'.repeat(12001), 'Audit input'))
      .toThrow(new ValidationError('Audit input exceeds maximum length of 12000 characters'))
  })
  it('rejects long base64 blocks', () => {
    expect(() => sanitiseUntrustedInput('A'.repeat(200), 'Exposure input')).toThrow('Exposure input contains potentially obfuscated content')
  })
  it('rejects script content', () => {
    expect(() => sanitiseUntrustedInput('<SCRIPT>x', 'Audit input')).toThrow('Audit input contains disallowed content')
  })
})

it('withRedactionWarning prefixes the warning only when redaction changed the text', () => {
  expect(withRedactionWarning('a', 'a')).toBe('a')
  expect(withRedactionWarning('a', 'b')).toBe(`${REDACTION_WARNING}\n\nb`)
})
