import crypto from 'node:crypto'
import { OrchestrateRequest, OrchestrateResponse, ProviderUnavailableError } from './types'
import { availableProviders } from './provider'
import { decompose } from './decompose'
import { dispatch } from './dispatch'
import { applyGuardrail } from './guardrail'
import { synthesise } from './synthesise'
import { redactSecrets } from './secrets'

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  // Dynamic require to avoid module-level Supabase init in tests
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@supabase/supabase-js')
  return createClient(url, key)
}

async function writeAuditLog(params: {
  taskHash: string
  skillSlugs: string[]
  totalInputTokens: number
  totalOutputTokens: number
  durationMs: number
  guardrailSummary: { passed: number; flagged: number; blocked: number }
}): Promise<void> {
  const client = getSupabaseClient()
  if (!client) return
  try {
    await client.from('themis_audit_log').insert({
      task_hash: params.taskHash,
      skill_slugs: params.skillSlugs,
      total_input_tokens: params.totalInputTokens,
      total_output_tokens: params.totalOutputTokens,
      duration_ms: params.durationMs,
      guardrail_passed: params.guardrailSummary.passed,
      guardrail_flagged: params.guardrailSummary.flagged,
      guardrail_blocked: params.guardrailSummary.blocked,
      created_at: new Date().toISOString(),
    })
  } catch {
    // Audit log failure must not break the orchestration response — swallow silently
  }
}

export async function orchestrate(req: OrchestrateRequest): Promise<OrchestrateResponse> {
  const startTime = Date.now()

  // Check providers before doing any work
  if (availableProviders().length === 0) {
    throw new ProviderUnavailableError('No AI providers configured')
  }

  // 1. Decompose
  const subTasks = await decompose(req)

  // 2. Dispatch
  const rawResults = await dispatch(subTasks, req.provider)

  // 3. Guardrail each result
  const guardrailedResults = await Promise.all(rawResults.map(r => applyGuardrail(r)))

  // 4. Count guardrail outcomes
  const guardrailSummary = {
    passed: guardrailedResults.filter(r => r.guardrail === 'PASS').length,
    flagged: guardrailedResults.filter(r => r.guardrail === 'FLAG').length,
    blocked: guardrailedResults.filter(r => r.guardrail === 'BLOCK').length,
  }

  // 5. Filter out BLOCKED results for synthesis
  const synthesisResults = guardrailedResults.filter(r => r.guardrail !== 'BLOCK')

  // 6. Synthesise
  const rawReport = await synthesise(req.task, synthesisResults)
  const report = redactSecrets(rawReport)

  const durationMs = Date.now() - startTime

  // 7. Aggregate token counts
  const totalInputTokens = guardrailedResults.reduce((sum, r) => sum + r.inputTokens, 0)
  const totalOutputTokens = guardrailedResults.reduce((sum, r) => sum + r.outputTokens, 0)

  // 8. Build skill trace (unique slugs, no duplicates)
  const skillTrace = [...new Set(guardrailedResults.map(r => r.skill))]

  // 9. Hash the sanitised task for audit (do NOT log the task content itself)
  const taskHash = crypto.createHash('sha256').update(req.task).digest('hex')

  // 10. Write audit log (fire-and-forget, non-blocking)
  writeAuditLog({
    taskHash,
    skillSlugs: skillTrace,
    totalInputTokens,
    totalOutputTokens,
    durationMs,
    guardrailSummary,
  }).catch(() => {}) // swallow — audit must not break response

  return {
    report,
    subTaskResults: guardrailedResults,
    guardrailSummary,
    skillTrace,
    totalInputTokens,
    totalOutputTokens,
    durationMs,
  }
}
