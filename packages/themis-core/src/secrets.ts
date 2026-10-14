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

  // 6. Credentials embedded in URLs (scheme://user:password@host) — before the email rule, which would eat them
  result = result.replace(/\b([a-z][a-z0-9+.\-]*:\/\/)[^\s:@\/]+:[^\s@\/]+@/gi, '$1[REDACTED]@')

  // 7. Email addresses
  result = result.replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, '[REDACTED]')

  // 8. JSON Web Tokens (three base64url segments, header starts with eyJ)
  result = result.replace(/\beyJ[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}/g, '[REDACTED]')

  // 9. Bearer tokens in headers or prose
  result = result.replace(/\bBearer\s+[A-Za-z0-9\-._~+\/]{16,}=*/gi, 'Bearer [REDACTED]')

  // 10. Provider API keys: OpenAI / Anthropic (sk-, sk-ant-), Google (AIza), Stripe, Slack, GitHub fine-grained PATs
  result = result.replace(/\bsk-(?:ant-)?[A-Za-z0-9_\-]{20,}/g, '[REDACTED]')
  result = result.replace(/\bAIza[0-9A-Za-z_\-]{35}/g, '[REDACTED]')
  result = result.replace(/\b(?:sk|rk)_(?:live|test)_[0-9A-Za-z]{16,}/g, '[REDACTED]')
  result = result.replace(/\bxox[abposr]-[A-Za-z0-9\-]{10,}/g, '[REDACTED]')
  result = result.replace(/\bgithub_pat_[A-Za-z0-9_]{22,}/g, '[REDACTED]')

  // 11. Azure storage / service bus keys and SAS signatures in connection strings
  result = result.replace(/\b(AccountKey|SharedAccessKey|SharedAccessSignature)=[^;\s"']{16,}/gi, '$1=[REDACTED]')
  result = result.replace(/([?&]sig=)[A-Za-z0-9%+\/=]{16,}/g, '$1[REDACTED]')

  return result
}
