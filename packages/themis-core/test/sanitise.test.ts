import { sanitiseTask, validateContext } from '@/lib/themis/sanitise'
import { ValidationError } from '@/lib/themis/types'

describe('sanitiseTask', () => {
  test('preserves newlines and tabs', () => {
    const input = 'line one\nline two\ttabbed'
    expect(sanitiseTask(input)).toBe('line one\nline two\ttabbed')
  })

  test('strips control characters (\\x00-\\x08)', () => {
    const input = 'hello\x00\x01\x02\x03\x04\x05\x06\x07\x08world'
    expect(sanitiseTask(input)).toBe('helloworld')
  })

  test('strips \\x0B (vertical tab)', () => {
    const input = 'hello\x0Bworld'
    expect(sanitiseTask(input)).toBe('helloworld')
  })

  test('strips \\x0C (form feed)', () => {
    const input = 'hello\x0Cworld'
    expect(sanitiseTask(input)).toBe('helloworld')
  })

  test('strips \\x0E-\\x1F control characters', () => {
    const input = 'hello\x0E\x0F\x10\x1Fworld'
    expect(sanitiseTask(input)).toBe('helloworld')
  })

  test('strips \\x7F (DEL)', () => {
    const input = 'hello\x7Fworld'
    expect(sanitiseTask(input)).toBe('helloworld')
  })

  test('returns sanitised string for clean input', () => {
    const input = 'Analyse the login endpoint for SQL injection vulnerabilities.'
    expect(sanitiseTask(input)).toBe(input)
  })

  test('throws ValidationError if result exceeds 4000 chars', () => {
    const input = 'a'.repeat(4001)
    expect(() => sanitiseTask(input)).toThrow(ValidationError)
    expect(() => sanitiseTask(input)).toThrow('4000')
  })

  test('does not throw for exactly 4000 chars', () => {
    // Use a string that won't match the base64 pattern: mix of non-alphanumeric chars
    // The base64 pattern is /[A-Za-z0-9+/]{200,}/ so break it up with spaces
    const chunk = 'Analyse the security posture of this system. '
    // Repeat to fill up to 4000 chars, trimming to exactly 4000
    const input = chunk.repeat(Math.ceil(4000 / chunk.length)).slice(0, 4000)
    expect(input).toHaveLength(4000)
    expect(() => sanitiseTask(input)).not.toThrow()
  })

  test('throws ValidationError if base64 block > 200 chars present', () => {
    // 201 base64 chars (no spaces to break it up)
    const b64 = 'A'.repeat(201)
    expect(() => sanitiseTask(`prefix ${b64} suffix`)).toThrow(ValidationError)
    expect(() => sanitiseTask(`prefix ${b64} suffix`)).toThrow('obfuscated')
  })

  test('does not throw for base64-like block of exactly 199 chars', () => {
    const b64 = 'A'.repeat(199)
    expect(() => sanitiseTask(`prefix ${b64} suffix`)).not.toThrow()
  })

  test('throws ValidationError if <script present (lowercase)', () => {
    expect(() => sanitiseTask('hello <script>alert(1)</script>')).toThrow(ValidationError)
    expect(() => sanitiseTask('hello <script>alert(1)</script>')).toThrow('disallowed')
  })

  test('throws ValidationError if <script present (uppercase)', () => {
    expect(() => sanitiseTask('hello <SCRIPT>alert(1)</SCRIPT>')).toThrow(ValidationError)
  })

  test('throws ValidationError if <script present (mixed case)', () => {
    expect(() => sanitiseTask('hello <Script>alert(1)</Script>')).toThrow(ValidationError)
  })

  test('throws ValidationError if javascript: present (lowercase)', () => {
    expect(() => sanitiseTask('click here javascript:void(0)')).toThrow(ValidationError)
    expect(() => sanitiseTask('click here javascript:void(0)')).toThrow('disallowed')
  })

  test('throws ValidationError if javascript: present (uppercase)', () => {
    expect(() => sanitiseTask('JAVASCRIPT:void(0)')).toThrow(ValidationError)
  })
})

describe('validateContext', () => {
  test('throws ValidationError if environments.length > 20', () => {
    const ctx = {
      environments: Array.from({ length: 21 }, (_, i) => `env${i}`),
      attackSurfaceTags: [],
    }
    expect(() => validateContext(ctx)).toThrow(ValidationError)
    expect(() => validateContext(ctx)).toThrow('environments')
  })

  test('does not throw for exactly 20 environments', () => {
    const ctx = {
      environments: Array.from({ length: 20 }, (_, i) => `env${i}`),
      attackSurfaceTags: [],
    }
    expect(() => validateContext(ctx)).not.toThrow()
  })

  test('throws ValidationError if attackSurfaceTags.length > 20', () => {
    const ctx = {
      environments: [],
      attackSurfaceTags: Array.from({ length: 21 }, (_, i) => `tag${i}`),
    }
    expect(() => validateContext(ctx)).toThrow(ValidationError)
    expect(() => validateContext(ctx)).toThrow('attackSurfaceTags')
  })

  test('throws ValidationError if slug > 50 chars', () => {
    const ctx = {
      environments: ['a'.repeat(51)],
      attackSurfaceTags: [],
    }
    expect(() => validateContext(ctx)).toThrow(ValidationError)
  })

  test('throws ValidationError if slug has uppercase chars', () => {
    const ctx = {
      environments: ['CloudNative'],
      attackSurfaceTags: [],
    }
    expect(() => validateContext(ctx)).toThrow(ValidationError)
  })

  test('throws ValidationError if slug is empty string', () => {
    const ctx = {
      environments: [''],
      attackSurfaceTags: [],
    }
    expect(() => validateContext(ctx)).toThrow(ValidationError)
  })

  test('throws ValidationError if slug contains spaces', () => {
    const ctx = {
      environments: ['cloud native'],
      attackSurfaceTags: [],
    }
    expect(() => validateContext(ctx)).toThrow(ValidationError)
  })

  test('does not throw for valid slugs', () => {
    const ctx = {
      environments: ['enterprise', 'cloud-native', 'web_apps'],
      attackSurfaceTags: ['api', 'auth-bypass', 'xss_injection'],
    }
    expect(() => validateContext(ctx)).not.toThrow()
  })

  test('does not throw for empty arrays', () => {
    const ctx = { environments: [], attackSurfaceTags: [] }
    expect(() => validateContext(ctx)).not.toThrow()
  })
})
