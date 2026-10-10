import { redactSecrets } from '@/lib/themis/secrets'

describe('redactSecrets', () => {
  test('redacts AWS access key (AKIA + 16 uppercase alphanumeric)', () => {
    const text = 'The access key is AKIAIOSFODNN7EXAMPLE and should be redacted'
    const result = redactSecrets(text)
    expect(result).not.toContain('AKIAIOSFODNN7EXAMPLE')
    expect(result).toContain('[REDACTED]')
  })

  test('redacts GitHub token (ghp_ prefix)', () => {
    const token = 'ghp_' + 'A'.repeat(36)
    const text = `Authorization: Bearer ${token}`
    const result = redactSecrets(text)
    expect(result).not.toContain(token)
    expect(result).toContain('[REDACTED]')
  })

  test('redacts GitHub personal access token (gho_ prefix)', () => {
    const token = 'gho_' + 'B'.repeat(36)
    const text = `token=${token}`
    const result = redactSecrets(text)
    expect(result).not.toContain(token)
    expect(result).toContain('[REDACTED]')
  })

  test('redacts PEM private key block (BEGIN RSA PRIVATE KEY)', () => {
    const pem = '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA1234\n-----END RSA PRIVATE KEY-----'
    const text = `Here is a key: ${pem}`
    const result = redactSecrets(text)
    expect(result).not.toContain('BEGIN RSA PRIVATE KEY')
    expect(result).toContain('[REDACTED]')
  })

  test('redacts PEM private key block (BEGIN PRIVATE KEY)', () => {
    const pem = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkq\n-----END PRIVATE KEY-----'
    const result = redactSecrets(pem)
    expect(result).not.toContain('BEGIN PRIVATE KEY')
    expect(result).toContain('[REDACTED]')
  })

  test('redacts email address', () => {
    const text = 'Contact admin@example.com for access'
    const result = redactSecrets(text)
    expect(result).not.toContain('admin@example.com')
    expect(result).toContain('[REDACTED]')
  })

  test('redacts generic API key pattern', () => {
    const text = 'api_key=abcdefghijklmnopqrstuvwxyz12345'
    const result = redactSecrets(text)
    expect(result).not.toContain('abcdefghijklmnopqrstuvwxyz12345')
    expect(result).toContain('[REDACTED]')
  })

  test('redacts token= pattern', () => {
    const text = 'token=verylongsecrettoken12345678901234567890'
    const result = redactSecrets(text)
    expect(result).not.toContain('verylongsecrettoken12345678901234567890')
    expect(result).toContain('[REDACTED]')
  })

  test('redacts password= pattern', () => {
    const text = 'password=supersecretpassword12345678901'
    const result = redactSecrets(text)
    expect(result).toContain('[REDACTED]')
  })

  test('clean security analysis text passes through unchanged (no false positives)', () => {
    const text = [
      'The application is vulnerable to SQL injection in the login endpoint.',
      'The attacker can bypass authentication using a boolean-based blind injection.',
      'Recommendation: use parameterized queries and prepared statements.',
      'Risk level: HIGH. Immediate remediation required.',
    ].join('\n')
    const result = redactSecrets(text)
    expect(result).toBe(text)
  })

  test('handles empty string', () => {
    expect(redactSecrets('')).toBe('')
  })

  test('handles text with no secrets', () => {
    const text = 'No secrets here. Just a normal analysis report.'
    expect(redactSecrets(text)).toBe(text)
  })

  test('redacts multiple secrets in same string', () => {
    const awsKey = 'AKIAIOSFODNN7EXAMPLE'
    const email = 'user@example.com'
    const text = `AWS key: ${awsKey}, contact: ${email}`
    const result = redactSecrets(text)
    expect(result).not.toContain(awsKey)
    expect(result).not.toContain(email)
  })
})
