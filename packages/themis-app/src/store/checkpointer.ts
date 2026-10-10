import type { RunnableConfig } from '@langchain/core/runnables'
import {
  BaseCheckpointSaver, copyCheckpoint, TASKS, WRITES_IDX_MAP,
  type Checkpoint, type CheckpointMetadata, type CheckpointTuple, type CheckpointListOptions,
  type PendingWrite, type CheckpointPendingWrite,
} from '@langchain/langgraph-checkpoint'
import type { AppDb } from './app-db'

interface CkRow {
  thread_id: string; checkpoint_ns: string; checkpoint_id: string
  parent_checkpoint_id: string | null; type: string | null
  checkpoint: Uint8Array; metadata: Uint8Array
}
interface WriteRow { task_id: string; channel: string; type: string | null; value: Uint8Array }

/**
 * LangGraph checkpointer on node:sqlite. Same semantics as MemorySaver
 * (@langchain/langgraph-checkpoint 0.0.18): pending_sends come from the parent's
 * TASKS writes; regular writes are first-write-wins; special (negative idx) replace.
 */
export class SqliteCheckpointSaver extends BaseCheckpointSaver {
  constructor(private readonly db: AppDb) { super() }

  private writesFor(thread: string, ns: string, id: string, channel?: string): WriteRow[] {
    const sql = `SELECT task_id, channel, type, value FROM app_checkpoint_writes
      WHERE thread_id = ? AND checkpoint_ns = ? AND checkpoint_id = ?${channel ? ' AND channel = ?' : ''}
      ORDER BY task_id, idx`
    const args = channel ? [thread, ns, id, channel] : [thread, ns, id]
    return this.db.prepare(sql).all(...args) as unknown as WriteRow[]
  }

  private async toTuple(row: CkRow): Promise<CheckpointTuple> {
    const { thread_id, checkpoint_ns, checkpoint_id, parent_checkpoint_id } = row
    const pendingSends = parent_checkpoint_id
      ? await Promise.all(this.writesFor(thread_id, checkpoint_ns, parent_checkpoint_id, TASKS)
        .map((w) => this.serde.loadsTyped(w.type ?? 'json', w.value)))
      : []
    const pendingWrites: CheckpointPendingWrite[] = await Promise.all(
      this.writesFor(thread_id, checkpoint_ns, checkpoint_id).map(async (w) =>
        [w.task_id, w.channel, await this.serde.loadsTyped(w.type ?? 'json', w.value)] as CheckpointPendingWrite))
    const tuple: CheckpointTuple = {
      config: { configurable: { thread_id, checkpoint_ns, checkpoint_id } },
      checkpoint: { ...(await this.serde.loadsTyped(row.type ?? 'json', row.checkpoint)), pending_sends: pendingSends } as Checkpoint,
      metadata: (await this.serde.loadsTyped(row.type ?? 'json', row.metadata)) as CheckpointMetadata,
      pendingWrites,
    }
    if (parent_checkpoint_id) {
      tuple.parentConfig = { configurable: { thread_id, checkpoint_ns, checkpoint_id: parent_checkpoint_id } }
    }
    return tuple
  }

  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const thread = config.configurable?.thread_id as string | undefined
    if (!thread) return undefined
    const ns = (config.configurable?.checkpoint_ns as string | undefined) ?? ''
    const id = config.configurable?.checkpoint_id as string | undefined
    const row = id
      ? this.db.prepare('SELECT * FROM app_checkpoints WHERE thread_id = ? AND checkpoint_ns = ? AND checkpoint_id = ?').get(thread, ns, id)
      : this.db.prepare('SELECT * FROM app_checkpoints WHERE thread_id = ? AND checkpoint_ns = ? ORDER BY checkpoint_id DESC LIMIT 1').get(thread, ns)
    return row ? this.toTuple(row as unknown as CkRow) : undefined
  }

  async *list(config: RunnableConfig, options: CheckpointListOptions = {}): AsyncGenerator<CheckpointTuple> {
    const where: string[] = []
    const args: string[] = []
    const c = config.configurable ?? {}
    if (c.thread_id) { where.push('thread_id = ?'); args.push(String(c.thread_id)) }
    if (c.checkpoint_ns !== undefined) { where.push('checkpoint_ns = ?'); args.push(String(c.checkpoint_ns)) }
    if (c.checkpoint_id) { where.push('checkpoint_id = ?'); args.push(String(c.checkpoint_id)) }
    const before = options.before?.configurable?.checkpoint_id
    if (before) { where.push('checkpoint_id < ?'); args.push(String(before)) }
    const sql = `SELECT * FROM app_checkpoints${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY checkpoint_id DESC`
    let remaining = options.limit
    for (const row of this.db.prepare(sql).all(...args) as unknown as CkRow[]) {
      const tuple = await this.toTuple(row)
      const md = (tuple.metadata ?? {}) as Record<string, unknown>
      if (options.filter && !Object.entries(options.filter).every(([k, v]) => md[k] === v)) continue
      if (remaining !== undefined) { if (remaining <= 0) break; remaining -= 1 }
      yield tuple
    }
  }

  async put(config: RunnableConfig, checkpoint: Checkpoint, metadata: CheckpointMetadata): Promise<RunnableConfig> {
    const thread = config.configurable?.thread_id as string | undefined
    if (!thread) throw new Error('Failed to put checkpoint: missing configurable.thread_id')
    const ns = (config.configurable?.checkpoint_ns as string | undefined) ?? ''
    const prepared = copyCheckpoint(checkpoint) as Partial<Checkpoint>
    delete prepared.pending_sends
    const [type, data] = this.serde.dumpsTyped(prepared)
    const [, meta] = this.serde.dumpsTyped(metadata)
    this.db.prepare(`INSERT OR REPLACE INTO app_checkpoints
      (thread_id, checkpoint_ns, checkpoint_id, parent_checkpoint_id, type, checkpoint, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(thread, ns, checkpoint.id, (config.configurable?.checkpoint_id as string | undefined) ?? null, type, data, meta)
    return { configurable: { thread_id: thread, checkpoint_ns: ns, checkpoint_id: checkpoint.id } }
  }

  async putWrites(config: RunnableConfig, writes: PendingWrite[], taskId: string): Promise<void> {
    const thread = config.configurable?.thread_id as string | undefined
    const id = config.configurable?.checkpoint_id as string | undefined
    if (!thread || !id) throw new Error('Failed to put writes: missing thread_id or checkpoint_id')
    const ns = (config.configurable?.checkpoint_ns as string | undefined) ?? ''
    const cols = '(thread_id, checkpoint_ns, checkpoint_id, task_id, idx, channel, type, value) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    const keepFirst = this.db.prepare(`INSERT OR IGNORE INTO app_checkpoint_writes ${cols}`)
    const replace = this.db.prepare(`INSERT OR REPLACE INTO app_checkpoint_writes ${cols}`)
    this.db.exec('BEGIN')
    try {
      writes.forEach(([channel, value], i) => {
        const idx = WRITES_IDX_MAP[channel] ?? i
        const [type, data] = this.serde.dumpsTyped(value)
        ;(idx < 0 ? replace : keepFirst).run(thread, ns, id, taskId, idx, channel, type, data)
      })
      this.db.exec('COMMIT')
    } catch (e) {
      this.db.exec('ROLLBACK')
      throw e
    }
  }

  deleteThread(threadId: string): void {
    this.db.prepare('DELETE FROM app_checkpoints WHERE thread_id = ?').run(threadId)
    this.db.prepare('DELETE FROM app_checkpoint_writes WHERE thread_id = ?').run(threadId)
  }
}
