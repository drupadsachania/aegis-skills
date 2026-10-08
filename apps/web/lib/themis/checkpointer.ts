import { MemorySaver } from '@langchain/langgraph'
import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint'

/**
 * Returns a fresh MemorySaver for each graph invocation.
 *
 * Security model: graph state never leaves the process. MemorySaver holds
 * state only for the lifetime of one graph.invoke() call — it is garbage
 * collected when the request completes and the graph goes out of scope.
 *
 * No DATABASE_URL, no Postgres, no external checkpointing.
 * The only persistence in Themis is the post-run debrief record written
 * to local SQLite by lib/themis/debrief.ts — metadata only, no findings.
 *
 * Phase 2 (ASM) will introduce structured attack-surface state persistence
 * separately with its own security controls.
 */
export async function getCheckpointer(): Promise<BaseCheckpointSaver> {
  return new MemorySaver()
}
