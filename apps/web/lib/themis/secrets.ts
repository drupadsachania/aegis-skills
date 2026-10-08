export function redactSecrets(text: string): string {
  let result = text

  // 1. AWS access keys
  result = result.replace(/AKIA[0-9A-Z]{16}/g, '[REDACTED]')

  // 2. AWS secret keys (contextual)
  result = result.replace(/(aws.{0,20})?secret.{0,5}[=:]["']?[A-Za-z0-9\/+=]{40}/gi, '[REDACTED]')

  // 3. GitHub tokens
  result = result.replace(/gh[pousr]_[A-Za-z0-9]{36,255}/g, '[REDACTED]')

  // 4. Generic high-entropy secrets
  result = result.replace(/(api[_-]?key|apikey|secret|token|password|passwd|auth)[=:\s]["']?[A-Za-z0-9\-_\.]{20,}/gi, '[REDACTED]')

  // 5. PEM private key blocks
  result = result.replace(/-----BEGIN[A-Z\s]+PRIVATE KEY-----[\s\S]+?-----END[A-Z\s]+PRIVATE KEY-----/g, '[REDACTED]')

  // 6. Email addresses
  result = result.replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, '[REDACTED]')

  return result
}
