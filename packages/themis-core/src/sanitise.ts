import { ValidationError, OrchestrateRequest } from './types'

export function sanitiseTask(raw: string): string {
  // Strip control characters except \n (\x0A) and \t (\x09)
  const stripped = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  // Reject if exceeds 4000 characters
  if (stripped.length > 4000) {
    throw new ValidationError('Task exceeds maximum length of 4000 characters')
  }

  // Reject if contains base64 block longer than 200 characters (obfuscated injection indicator)
  if (/[A-Za-z0-9+/]{200,}={0,2}/.test(stripped)) {
    throw new ValidationError('Task contains potentially obfuscated content')
  }

  // Reject if contains <script or javascript: (case-insensitive)
  if (/<script/i.test(stripped) || /javascript:/i.test(stripped)) {
    throw new ValidationError('Task contains disallowed content')
  }

  return stripped
}

export function validateContext(ctx: OrchestrateRequest['context']): void {
  const { environments, attackSurfaceTags } = ctx

  // Arrays must each have at most 20 items
  if (environments.length > 20) {
    throw new ValidationError('environments array exceeds maximum of 20 items')
  }
  if (attackSurfaceTags.length > 20) {
    throw new ValidationError('attackSurfaceTags array exceeds maximum of 20 items')
  }

  // Each item: string of 1-50 chars matching /^[a-z0-9\-_]+$/
  const SLUG_RE = /^[a-z0-9\-_]+$/
  for (const item of environments) {
    if (typeof item !== 'string' || item.length === 0 || item.length > 50 || !SLUG_RE.test(item)) {
      throw new ValidationError('environments contains an invalid slug')
    }
  }
  for (const item of attackSurfaceTags) {
    if (typeof item !== 'string' || item.length === 0 || item.length > 50 || !SLUG_RE.test(item)) {
      throw new ValidationError('attackSurfaceTags contains an invalid slug')
    }
  }

  // Unknown env slugs are silently dropped (not rejected) — caller should filter the array
  // This function only validates structure, not domain validity
}
