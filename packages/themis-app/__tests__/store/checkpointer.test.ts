import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Annotation, StateGraph, START, END, interrupt, Command } from '@langchain/langgraph'
import { emptyCheckpoint, TASKS, type Checkpoint } from '@langchain/langgraph-checkpoint'
import { openAppDb } from '../../src/store/app-db'
import { SqliteCheckpointSaver } from '../../src/store/checkpointer'

const cp = (id: string): Checkpoint => ({ ...emptyCheckpoint(), id, channel_values: { x: id } })
const cfg = (thread: string, id?: string, ns = '') =>
  ({ configurable: { thread_id: thread, checkpoint_ns: ns, ...(id ? { checkpoint_id: id } : {}) } })

describe('SqliteCheckpointSaver', () => {
  it('puts and gets the latest or a specific checkpoint with its parent', async () => {
    const s = new SqliteCheckpointSaver(openAppDb(':memory:'))
    const c1 = await s.put(cfg('t1'), cp('0001'), { source: 'input', step: -1, writes: null, parents: {} }, {})
    await s.put(c1, cp('0002'), { source: 'loop', step: 0, writes: null, parents: {} }, {})
    const latest = await s.getTuple(cfg('t1'))
    expect(latest?.checkpoint.id).toBe('0002')
    expect(latest?.parentConfig?.configurable?.checkpoint_id).toBe('0001')
    expect((await s.getTuple(cfg('t1', '0001')))?.checkpoint.channel_values).toEqual({ x: '0001' })
    expect(await s.getTuple(cfg('nope'))).toBeUndefined()
  })

  it('lists newest first with limit, before and metadata filter', async () => {
    const s = new SqliteCheckpointSaver(openAppDb(':memory:'))
    let c = cfg('t')
    for (const id of ['0001', '0002', '0003']) c = await s.put(c, cp(id), { source: 'loop', step: Number(id), writes: null, parents: {} }, {})
    const ids = async (opts?: object) => { const out: string[] = []; for await (const t of s.list(cfg('t'), opts)) out.push(t.checkpoint.id); return out }
    expect(await ids()).toEqual(['0003', '0002', '0001'])
    expect(await ids({ limit: 2 })).toEqual(['0003', '0002'])
    expect(await ids({ before: cfg('t', '0003') })).toEqual(['0002', '0001'])
    expect(await ids({ filter: { step: 2 } })).toEqual(['0002'])
  })

  it('keeps regular writes first-write-wins and rebuilds pending_sends from the parent', async () => {
    const s = new SqliteCheckpointSaver(openAppDb(':memory:'))
    const c1 = await s.put(cfg('t'), cp('0001'), { source: 'loop', step: 0, writes: null, parents: {} }, {})
    await s.putWrites(c1, [[TASKS, { node: 'fanout', args: { n: 1 } }], ['a', 1]], 'task-1')
    await s.putWrites(c1, [['a', 2]], 'task-1')
    const t1 = await s.getTuple(c1)
    expect(t1?.pendingWrites?.find((w) => w[1] === 'a')?.[2]).toBe(1)
    await s.put(c1, cp('0002'), { source: 'loop', step: 1, writes: null, parents: {} }, {})
    const t2 = await s.getTuple(cfg('t'))
    expect(t2?.checkpoint.pending_sends).toEqual([{ node: 'fanout', args: { n: 1 } }])
  })

  it('isolates namespaces', async () => {
    const s = new SqliteCheckpointSaver(openAppDb(':memory:'))
    await s.put(cfg('t', undefined, ''), cp('0001'), { source: 'loop', step: 0, writes: null, parents: {} }, {})
    await s.put(cfg('t', undefined, 'sub'), cp('0009'), { source: 'loop', step: 0, writes: null, parents: {} }, {})
    expect((await s.getTuple(cfg('t')))?.checkpoint.id).toBe('0001')
  })

  it('survives a process restart: interrupt, reopen the file, resume', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ckpt-'))
    const file = path.join(dir, 'app.db')
    const State = Annotation.Root({ log: Annotation<string[]>({ reducer: (a, b) => [...a, ...b], default: () => [] }) })
    const build = (saver: SqliteCheckpointSaver) => new StateGraph(State)
      .addNode('ask', () => { const answer = interrupt('approve?') as string; return { log: [`answer:${answer}`] } })
      .addNode('done', () => ({ log: ['done'] }))
      .addEdge(START, 'ask').addEdge('ask', 'done').addEdge('done', END)
      .compile({ checkpointer: saver })
    const config = { configurable: { thread_id: 'run-1' } }

    const db1 = openAppDb(file)
    const g1 = build(new SqliteCheckpointSaver(db1))
    await g1.invoke({ log: ['start'] }, config)
    const snap = await g1.getState(config)
    expect(snap.tasks.some((t) => t.interrupts.length > 0)).toBe(true)
    db1.close()

    const db2 = openAppDb(file)
    const g2 = build(new SqliteCheckpointSaver(db2))
    const final = await g2.invoke(new Command({ resume: 'yes' }), config)
    expect(final.log).toEqual(['start', 'answer:yes', 'done'])
    db2.close()
    fs.rmSync(dir, { recursive: true, force: true })
  })
})
