jest.mock('@langchain/langgraph', () => ({
  MemorySaver: jest.fn().mockImplementation(() => ({ _type: 'memory-saver' })),
}))

afterEach(() => {
  jest.resetModules()
})

describe('getCheckpointer', () => {
  it('always returns a MemorySaver (no external persistence)', async () => {
    const { getCheckpointer } = await import('@/lib/themis/checkpointer')
    const cp = await getCheckpointer()
    expect((cp as Record<string, unknown>)._type).toBe('memory-saver')
  })

  it('returns MemorySaver even if DATABASE_URL is set (ignored by design)', async () => {
    process.env.DATABASE_URL = 'postgresql://should-be-ignored'
    const { getCheckpointer } = await import('@/lib/themis/checkpointer')
    const cp = await getCheckpointer()
    expect((cp as Record<string, unknown>)._type).toBe('memory-saver')
    delete process.env.DATABASE_URL
  })

  it('returns a new instance each call (no shared singleton)', async () => {
    const { getCheckpointer } = await import('@/lib/themis/checkpointer')
    const a = await getCheckpointer()
    const b = await getCheckpointer()
    // Each call returns its own MemorySaver — no shared in-memory state
    expect(a).not.toBe(b)
  })
})
