import { redactSecrets } from '../src/secrets'

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

  // Fixtures are assembled at run time so this file never holds a credential-shaped literal.
  test.each([
    ['JWT', ['eyJhbGciOiJIUzI1NiJ9', 'eyJzdWIiOiIxMjM0NTY3ODkwIn0', 'SflKxwRJSMeKKF2QT4fwpMeJf36P'].join('.')],
    ['OpenAI-style key', 'sk-' + 'A1b2C3d4'.repeat(4)],
    ['Anthropic-style key', 'sk-ant-' + 'api03_' + 'x9Y8z7W6'.repeat(4)],
    ['Google API key', 'AIza' + 'S'.repeat(35)],
    ['Stripe key', ['sk', 'live', 'Q'.repeat(24)].join('_')],
    ['Slack token', 'xox' + 'b-' + '1234567890-abcdefghij'],
    ['GitHub fine-grained PAT', 'github_pat_' + 'Z'.repeat(30)],
  ])('redacts a %s', (_label, secret) => {
    const result = redactSecrets(`value: ${secret} end`)
    expect(result).not.toContain(secret)
    expect(result).toContain('[REDACTED]')
  })

  test('redacts a Bearer token and keeps the scheme word', () => {
    const tok = 'Q'.repeat(12) + '.' + 'r'.repeat(12)
    const result = redactSecrets(`Authorization: Bearer ${tok}`)
    expect(result).not.toContain(tok)
    expect(result).toContain('Bearer [REDACTED]')
  })

  test('redacts credentials embedded in a URL but keeps the host', () => {
    const result = redactSecrets('postgres://svc_user:' + 'Hunter2Hunter2' + '@db.internal:5432/app')
    expect(result).not.toContain('Hunter2Hunter2')
    expect(result).toContain('postgres://[REDACTED]@db.internal:5432/app')
  })

  test('redacts Azure account keys and SAS signatures', () => {
    const key = 'K'.repeat(40) + '=='
    const r1 = redactSecrets(`DefaultEndpointsProtocol=https;AccountName=acct;AccountKey=${key};EndpointSuffix=core.windows.net`)
    expect(r1).not.toContain(key)
    expect(r1).toContain('AccountKey=[REDACTED]')
    const sig = 'abc' + 'D'.repeat(30) + '%3D'
    expect(redactSecrets(`https://acct.blob.core.windows.net/c/f?sv=2024&sig=${sig}`)).not.toContain(sig)
  })

  test('leaves hashes, IPs, hostnames and CVE ids alone (they are analysis data, not secrets)', () => {
    const text = 'SHA256 ' + 'a'.repeat(64) + ' seen on 10.0.0.5 (web-01.corp) exploiting CVE-2024-3400'
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
