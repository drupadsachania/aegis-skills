// Shared sanitiser for long untrusted inputs (audit + exposure workflows).
// Same rules as sanitiseTask, with a 12000-char limit and a caller-supplied label.
import { ValidationError } from './types'

export const UNTRUSTED_INPUT_MAX_CHARS = 12000
export const REDACTION_WARNING = '[WARNING: Sensitive data was detected and redacted from the input]'

export function sanitiseUntrustedInput(raw: string, label: string, maxChars: number = UNTRUSTED_INPUT_MAX_CHARS): string {
  // Strip control characters except \n (\x0A) and \t (\x09)
  const stripped = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  if (stripped.length > maxChars) {
    throw new ValidationError(`${label} exceeds maximum length of ${maxChars} characters`)
  }
  // Base64 block longer than 200 characters = obfuscated injection indicator
  if (/[A-Za-z0-9+/]{200,}={0,2}/.test(stripped)) {
    throw new ValidationError(`${label} contains potentially obfuscated content`)
  }
  if (/<script/i.test(stripped) || /javascript:/i.test(stripped)) {
    throw new ValidationError(`${label} contains disallowed content`)
  }
  return stripped
}

/** Prefix the redaction warning when redactSecrets changed the text. */
export function withRedactionWarning(original: string, redacted: string): string {
  return redacted !== original ? `${REDACTION_WARNING}\n\n${redacted}` : redacted
}
