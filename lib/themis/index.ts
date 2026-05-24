import { randomUUID } from 'node:crypto'
import type { OrchestrateRequest, OrchestrateResponse } from './types'
import { ProviderUnavailableError } from './types'
import { availableProviders } from './provider'
import { getThemisGraph } from './graph/index'

/**
 * orchestrate()
 *
 * Entry point for the Themis orchestration layer. Delegates entirely to
 * the LangGraph StateGraph built in lib/themis/graph/index.ts.
 *
 * The graph handles: validate → decompose → skill-agents (parallel) →
 * guardrail → synthesise → audit.
 *
 * State lives only for the duration of one graph.invoke() call (MemorySaver,
 * in-process only). The only persistent artefact is the metadata-only debrief
 * record written to local SQLite by auditNode — no findings, no task content.
 *
 * If req.threadId is provided, the graph resumes from the last in-memory
 * checkpoint for that thread (same process, same MemorySaver instance).
 * Otherwise a new UUID is generated.
 *
 * SECURITY: No task content, findings text, or user-derived strings are
 * ever logged. Redaction is applied in the graph nodes.
 */
export async function orchestrate(req: OrchestrateRequest): Promise<OrchestrateResponse> {
  if (availableProviders().length === 0) {
    throw new ProviderUnavailableError('No AI providers configured')
  }

  const threadId = req.threadId ?? randomUUID()
  const graph = await getThemisGraph()

  const finalState = await graph.invoke(
    {
      task: req.task,
      context: req.context,
      provider: req.provider,
    },
    {
      configurable: { thread_id: threadId },
    }
  )

  return {
    report: finalState.report ?? '',
    subTaskResults: finalState.guardrailedResults ?? [],
    guardrailSummary: finalState.guardrailSummary ?? { passed: 0, flagged: 0, blocked: 0 },
    skillTrace: finalState.skillTrace ?? [],
    totalInputTokens: finalState.totalInputTokens ?? 0,
    totalOutputTokens: finalState.totalOutputTokens ?? 0,
    durationMs: finalState.durationMs ?? 0,
    threadId,
  }
}
