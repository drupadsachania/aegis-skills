import { sanitiseTask, normaliseSubTasks, parseDecomposeResponse, decomposeSystemPrompt, decomposeUserMessage, type OrchestrateRequest, type SubTask } from '@aegis-skills/themis-core'
import { llm } from './provider'

function getBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL ?? 'http://localhost:3000'
  if (raw.startsWith('http')) return raw.replace(/\/$/, '')
  return `https://${raw}`
}

async function fetchSkillSlugs(): Promise<string[]> {
  const url = `${getBaseUrl()}/api/skills`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch skill list')
  const json = await res.json()
  // /api/skills returns { skills: [...objects...] } — extract names
  if (!json || !Array.isArray(json.skills)) {
    throw new Error('Skill list response is not in expected format')
  }
  const slugs = json.skills
    .map((s: unknown) => (typeof s === 'object' && s !== null && 'name' in s ? (s as { name: unknown }).name : null))
    .filter((n: unknown): n is string => typeof n === 'string' && n.length > 0)
  if (slugs.length === 0) throw new Error('Skill list is empty')
  return slugs
}

async function callDecompose(sanitisedTask: string, skillSlugs: string[], provider?: OrchestrateRequest['provider']): Promise<SubTask[]> {
  const response = await llm({
    systemPrompt: decomposeSystemPrompt(skillSlugs),
    userMessage: decomposeUserMessage(sanitisedTask),
    maxTokens: 2048,
    temperature: 0.2,
    tier: 'fast',
    provider,
  })
  return parseDecomposeResponse(response.content)
}

export async function decompose(req: OrchestrateRequest): Promise<SubTask[]> {
  // Sanitise first — propagate ValidationError if thrown
  const sanitisedTask = sanitiseTask(req.task)

  const skillSlugs = await fetchSkillSlugs()

  try {
    return normaliseSubTasks(await callDecompose(sanitisedTask, skillSlugs, req.provider), skillSlugs)
  } catch {
    // Retry once on parse failure
    try {
      return normaliseSubTasks(await callDecompose(sanitisedTask, skillSlugs, req.provider), skillSlugs)
    } catch (retryErr) {
      throw new Error('Decompose failed after retry: ' + (retryErr instanceof Error ? retryErr.message : 'Unknown error'))
    }
  }
}
