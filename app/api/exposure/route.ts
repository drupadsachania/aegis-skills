import { NextRequest, NextResponse } from 'next/server'
import { validateExposure } from '@/lib/themis/exposure/index'
import { redactSecrets } from '@/lib/themis/secrets'
import { ValidationError, ProviderUnavailableError } from '@/lib/themis/types'
import {
  ExposureRequest,
  EvidenceInput,
  EvidenceType,
  BusinessCriticality,
} from '@/lib/themis/exposure/types'

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
  return 'Exposure validation failed'
}

function extractIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const raw = forwarded ? forwarded.split(',')[0].trim() : null
  const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/
  const IPV6_RE = /^[0-9a-fA-F:]{2,39}$/
  if (raw && (IPV4_RE.test(raw) || IPV6_RE.test(raw))) return raw
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
        await client.from('themis_rate_limits').upsert({ ip, count: 1, window_start: now.toISOString() })
      } else {
        await client.from('themis_rate_limits').update({ count: (data.count as number) + 1 }).eq('ip', ip)
      }
    } else {
      await client.from('themis_rate_limits').insert({ ip, count: 1, window_start: now.toISOString() })
    }
    return { limited: false }
  } catch {
    return { limited: false }
  }
}

const SLUG_RE = /^[a-z0-9\-_]+$/
const CVE_RE = /^CVE-\d{4}-\d{4,}$/i
const VALID_EVIDENCE_TYPES: EvidenceType[] = [
  'asset', 'network', 'configuration', 'software', 'vulnerability',
  'exploitation', 'telemetry', 'edr', 'siem', 'remediation', 'verification',
]
const VALID_CRITICALITY: BusinessCriticality[] = ['crown-jewel', 'high', 'medium', 'low', 'unknown']

function parseEvidence(raw: unknown): EvidenceInput[] {
  if (!Array.isArray(raw)) return []
  return (raw as unknown[])
    .map((e): EvidenceInput | null => {
      if (typeof e !== 'object' || e === null) return null
      const o = e as Record<string, unknown>
      if (typeof o.type !== 'string' || !VALID_EVIDENCE_TYPES.includes(o.type as EvidenceType)) return null
      if (typeof o.summary !== 'string' || typeof o.source !== 'string') return null
      let summary = redactSecrets(o.summary).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      if (summary.length > 1000) summary = summary.slice(0, 1000)
      const source = o.source.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, 120)
      return { type: o.type as EvidenceType, summary, source }
    })
    .filter((e): e is EvidenceInput => e !== null)
    .slice(0, 20)
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = extractIp(req)
  const { limited } = await checkRateLimit(ip)
  if (limited) {
    return applySecurityHeaders(
      NextResponse.json({ error: 'Request invalid' }, { status: 429, headers: { 'Retry-After': '60' } }),
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return applySecurityHeaders(NextResponse.json({ error: 'Request invalid' }, { status: 400 }))
  }
  if (typeof body !== 'object' || body === null) {
    return applySecurityHeaders(NextResponse.json({ error: 'Request invalid' }, { status: 400 }))
  }

  const b = body as Record<string, unknown>

  if (typeof b.input !== 'string') {
    return applySecurityHeaders(NextResponse.json({ error: 'Request invalid' }, { status: 400 }))
  }

  let input = redactSecrets(b.input).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  if (input.length > 12000) {
    return applySecurityHeaders(NextResponse.json({ error: 'Request invalid' }, { status: 400 }))
  }

  // Authorization context — required; absent/invalid fields default to the safe
  // (unauthorized) value, which the policy engine will DENY.
  const rawAuth = typeof b.authorization === 'object' && b.authorization !== null
    ? (b.authorization as Record<string, unknown>)
    : {}
  const authorization = {
    authorized: rawAuth.authorized === true,
    scopeConfirmed: rawAuth.scopeConfirmed === true,
    targetIdentityVerified: rawAuth.targetIdentityVerified === true,
    maintenanceWindow: rawAuth.maintenanceWindow === true,
    approver:
      typeof rawAuth.approver === 'string' && rawAuth.approver.length > 0 && rawAuth.approver.length <= 120
        ? rawAuth.approver.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        : undefined,
    expiresAt:
      typeof rawAuth.expiresAt === 'string' && !Number.isNaN(Date.parse(rawAuth.expiresAt))
        ? rawAuth.expiresAt
        : undefined,
  }

  const cve = typeof b.cve === 'string' && CVE_RE.test(b.cve) ? b.cve.toUpperCase() : undefined
  const kevListed = b.kevListed === true
  const epss =
    typeof b.epss === 'number' && b.epss >= 0 && b.epss <= 1 ? b.epss : undefined

  const rawContext = typeof b.context === 'object' && b.context !== null
    ? (b.context as Record<string, unknown>)
    : {}

  let systemType: string | undefined
  if (typeof rawContext.systemType === 'string' && rawContext.systemType.length <= 100 && SLUG_RE.test(rawContext.systemType)) {
    systemType = rawContext.systemType
  }
  let assetId: string | undefined
  if (typeof rawContext.assetId === 'string' && rawContext.assetId.length <= 100 && SLUG_RE.test(rawContext.assetId)) {
    assetId = rawContext.assetId
  }
  const businessCriticality: BusinessCriticality | undefined =
    typeof rawContext.businessCriticality === 'string' && VALID_CRITICALITY.includes(rawContext.businessCriticality as BusinessCriticality)
      ? (rawContext.businessCriticality as BusinessCriticality)
      : undefined
  let environments: string[] = []
  if (Array.isArray(rawContext.environments)) {
    environments = (rawContext.environments as unknown[]).filter(
      (e): e is string => typeof e === 'string' && e.length > 0 && e.length <= 50 && SLUG_RE.test(e),
    )
  }
  const crownJewel = rawContext.crownJewel === true

  const exposureReq: ExposureRequest = {
    input,
    cve,
    kevListed,
    epss,
    providedEvidence: parseEvidence(b.providedEvidence),
    authorization,
    context: { assetId, systemType, businessCriticality, environments, crownJewel },
  }

  try {
    const result = await validateExposure(exposureReq)
    return applySecurityHeaders(NextResponse.json(result, { status: 200 }))
  } catch (e) {
    if (e instanceof ValidationError) {
      return applySecurityHeaders(NextResponse.json({ error: 'Request invalid' }, { status: 400 }))
    }
    if (e instanceof ProviderUnavailableError) {
      return applySecurityHeaders(NextResponse.json({ error: 'AI providers unavailable' }, { status: 503 }))
    }
    return applySecurityHeaders(NextResponse.json({ error: safeError(e) }, { status: 500 }))
  }
}
