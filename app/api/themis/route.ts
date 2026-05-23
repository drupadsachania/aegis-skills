import { NextRequest, NextResponse } from 'next/server'
import { orchestrate } from '@/lib/themis/index'
import { sanitiseTask, validateContext } from '@/lib/themis/sanitise'
import { availableProviders } from '@/lib/themis/provider'
import { ValidationError, ProviderUnavailableError, OrchestrateRequest } from '@/lib/themis/types'

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
  return 'Orchestration failed'
}

function extractIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const raw = forwarded ? forwarded.split(',')[0].trim() : null

  // Validate IPv4 or IPv6 pattern
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
  if (!client) return { limited: false } // No Supabase — don't block

  const now = new Date()
  const windowSeconds = 60
  const maxRequests = 10

  try {
    // Fetch current row for this IP
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
        // Reset window
        await client
          .from('themis_rate_limits')
          .upsert({ ip, count: 1, window_start: now.toISOString() })
      } else {
        // Increment count
        await client
          .from('themis_rate_limits')
          .update({ count: (data.count as number) + 1 })
          .eq('ip', ip)
      }
    } else {
      // New IP — insert row
      await client
        .from('themis_rate_limits')
        .insert({ ip, count: 1, window_start: now.toISOString() })
    }

    return { limited: false }
  } catch {
    // Rate limit DB failure must not block requests
    return { limited: false }
  }
}

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

  // Provider check before parsing body (fast fail)
  if (availableProviders().length === 0) {
    return applySecurityHeaders(
      NextResponse.json({ error: 'AI providers unavailable' }, { status: 503 })
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

  // Validate task field
  if (typeof b.task !== 'string') {
    return applySecurityHeaders(
      NextResponse.json({ error: 'Request invalid' }, { status: 400 })
    )
  }

  // Sanitise task
  let sanitisedTask: string
  try {
    sanitisedTask = sanitiseTask(b.task)
  } catch (e) {
    if (e instanceof ValidationError) {
      return applySecurityHeaders(
        NextResponse.json({ error: 'Request invalid' }, { status: 400 })
      )
    }
    return applySecurityHeaders(
      NextResponse.json({ error: 'Orchestration failed' }, { status: 500 })
    )
  }

  // Parse and validate context
  const rawContext = typeof b.context === 'object' && b.context !== null ? b.context as Record<string, unknown> : {}
  const environments = Array.isArray(rawContext.environments) ? rawContext.environments : []
  const attackSurfaceTags = Array.isArray(rawContext.attackSurfaceTags) ? rawContext.attackSurfaceTags : []

  const context: OrchestrateRequest['context'] = { environments, attackSurfaceTags }

  try {
    validateContext(context)
  } catch (e) {
    if (e instanceof ValidationError) {
      return applySecurityHeaders(
        NextResponse.json({ error: 'Request invalid' }, { status: 400 })
      )
    }
    return applySecurityHeaders(
      NextResponse.json({ error: 'Orchestration failed' }, { status: 500 })
    )
  }

  // Validate provider field (optional)
  const validProviders = ['anthropic', 'openai', 'google']
  const provider = typeof b.provider === 'string' && validProviders.includes(b.provider)
    ? (b.provider as OrchestrateRequest['provider'])
    : undefined

  const orchestrateReq: OrchestrateRequest = {
    task: sanitisedTask,
    context,
    provider,
  }

  try {
    const result = await orchestrate(orchestrateReq)
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
