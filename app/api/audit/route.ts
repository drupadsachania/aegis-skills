import { NextRequest, NextResponse } from 'next/server'
import { audit } from '@/lib/themis/audit/index'
import { redactSecrets } from '@/lib/themis/secrets'
import { ValidationError, ProviderUnavailableError } from '@/lib/themis/types'
import { AuditRequest, Standard } from '@/lib/themis/audit/types'

// Security headers applied to every response regardless of status
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'",
}

function applySecurityHeaders(res: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(key, value)
  }
  return res
}

function safeError(e: unknown): string {
  if (e instanceof ValidationError) return 'Request invalid'
  if (e instanceof ProviderUnavailableError) return 'AI providers unavailable'
  return 'Audit failed'
}

function extractIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const raw = forwarded ? forwarded.split(',')[0].trim() : null

  const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/
  const IPV6_RE = /^[0-9a-fA-F:]{2,39}$/

  if (raw && (IPV4_RE.test(raw) || IPV6_RE.test(raw))) {
    return raw
  }
  return 'unknown'
}

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@supabase/supabase-js')
  return createClient(url, key)
}

async function checkRateLimit(ip: string): Promise<{ limited: boolean }> {
  const client = getSupabaseClient()
  if (!client) return { limited: false }

  const now = new Date()
  const windowSeconds = 60
  const maxRequests = 10

  try {
    const { data } = await client
      .from('themis_rate_limits')
      .select('count, window_start')
      .eq('ip', ip)
      .single()

    if (data) {
      const windowStart = new Date(data.window_start as string)
      const elapsed = (now.getTime() - windowStart.getTime()) / 1000

      if (elapsed < windowSeconds && (data.count as number) >= maxRequests) {
        return { limited: true }
      }

      if (elapsed >= windowSeconds) {
        await client
          .from('themis_rate_limits')
          .upsert({ ip, count: 1, window_start: now.toISOString() })
      } else {
        await client
          .from('themis_rate_limits')
          .update({ count: (data.count as number) + 1 })
          .eq('ip', ip)
      }
    } else {
      await client
        .from('themis_rate_limits')
        .insert({ ip, count: 1, window_start: now.toISOString() })
    }

    return { limited: false }
  } catch {
    return { limited: false }
  }
}

const VALID_STANDARDS: Standard[] = [
  'cis-l1', 'cis-l2', 'nist-csf', 'iso27001', 'soc2',
  'pci-dss', 'hipaa', 'iec-62443', 'nist-800-53',
]

const VALID_INPUT_TYPES = ['config', 'policy', 'description', 'evidence-package'] as const
type InputType = typeof VALID_INPUT_TYPES[number]

const SLUG_RE = /^[a-z0-9\-_]+$/

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Rate limiting
  const ip = extractIp(req)
  const { limited } = await checkRateLimit(ip)
  if (limited) {
    return applySecurityHeaders(
      NextResponse.json({ error: 'Request invalid' }, {
        status: 429,
        headers: { 'Retry-After': '60' },
      })
    )
  }

  // Parse body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return applySecurityHeaders(
      NextResponse.json({ error: 'Request invalid' }, { status: 400 })
    )
  }

  if (typeof body !== 'object' || body === null) {
    return applySecurityHeaders(
      NextResponse.json({ error: 'Request invalid' }, { status: 400 })
    )
  }

  const b = body as Record<string, unknown>

  // Validate input field
  if (typeof b.input !== 'string') {
    return applySecurityHeaders(
      NextResponse.json({ error: 'Request invalid' }, { status: 400 })
    )
  }

  // Apply redactSecrets then strip control chars
  let sanitisedInputForRoute = redactSecrets(b.input)
  sanitisedInputForRoute = sanitisedInputForRoute.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  // Check length after sanitisation
  if (sanitisedInputForRoute.length > 12000) {
    return applySecurityHeaders(
      NextResponse.json({ error: 'Request invalid' }, { status: 400 })
    )
  }

  // Validate inputType — default to 'description' if missing or invalid
  let inputType: InputType = 'description'
  if (typeof b.inputType === 'string' && VALID_INPUT_TYPES.includes(b.inputType as InputType)) {
    inputType = b.inputType as InputType
  }

  // Validate standards — filter to valid values, default to [] if not array
  let standards: Standard[] = []
  if (Array.isArray(b.standards)) {
    standards = (b.standards as unknown[])
      .filter((s): s is Standard => typeof s === 'string' && VALID_STANDARDS.includes(s as Standard))
  }

  // Validate context
  const rawContext = typeof b.context === 'object' && b.context !== null
    ? (b.context as Record<string, unknown>)
    : {}

  // context.systemType: optional string, max 100 chars, slug chars only
  let systemType: string | undefined
  if (typeof rawContext.systemType === 'string') {
    const st = rawContext.systemType
    if (st.length > 0 && st.length <= 100 && SLUG_RE.test(st)) {
      systemType = st
    }
    // If invalid: drop silently (undefined)
  }

  // context.environments: array of slugs
  let environments: string[] = []
  if (Array.isArray(rawContext.environments)) {
    environments = (rawContext.environments as unknown[]).filter(
      (e): e is string =>
        typeof e === 'string' &&
        e.length > 0 &&
        e.length <= 50 &&
        SLUG_RE.test(e),
    )
  }

  const auditReq: AuditRequest = {
    input: sanitisedInputForRoute,
    inputType,
    standards,
    context: {
      systemType,
      environments,
    },
  }

  try {
    const result = await audit(auditReq)
    return applySecurityHeaders(
      NextResponse.json(result, { status: 200 })
    )
  } catch (e) {
    if (e instanceof ValidationError) {
      return applySecurityHeaders(
        NextResponse.json({ error: 'Request invalid' }, { status: 400 })
      )
    }
    if (e instanceof ProviderUnavailableError) {
      return applySecurityHeaders(
        NextResponse.json({ error: 'AI providers unavailable' }, { status: 503 })
      )
    }
    return applySecurityHeaders(
      NextResponse.json({ error: safeError(e) }, { status: 500 })
    )
  }
}
