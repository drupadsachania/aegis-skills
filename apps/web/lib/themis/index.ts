import { randomUUID } from 'node:crypto'
import type { OrchestrateRequest, OrchestrateResponse } from './types'
import { ProviderUnavailableError } from './types'
import { availableProviders } from './provider'
import { getThemisGraph, THEMIS_RECURSION_LIMIT } from './graph/index'

/**
 * orchestrate()
 *
 * Entry point for the Themis orchestration layer. Delegates entirely to
 * the LangGraph StateGraph built in lib/themis/graph/index.ts.
 *
 * The graph handles: validate → decompose → skill-agents (parallel) →
 * guardrail → synthesise → audit.
 *
 * State lives only for the duration of one graph.invoke() call: every request
 * compiles its own graph with its own MemorySaver, so no run state is shared
 * between requests. The only persistent artefact is the metadata-only debrief
 * record written to local SQLite by auditNode — no findings, no task content.
 *
 * threadId is a run correlation id. It is echoed back to the caller but does
 * not resume earlier state (cross-request resume would require durable,
 * caller-bound checkpointing, which this deployment does not provide).
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
      recursionLimit: THEMIS_RECURSION_LIMIT,
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
    mcpApprovals: finalState.mcpApprovals ?? [],
    mcpCallCount: finalState.mcpCallCount ?? 0,
  }
}
