// Verifies the 8 new packages can be imported without error.
// If npm install was skipped, these will throw MODULE_NOT_FOUND.

describe('LangGraph dependency imports', () => {
  it('imports @langchain/langgraph', async () => {
    const { StateGraph, Annotation, Send, END, START } = await import('@langchain/langgraph')
    expect(StateGraph).toBeDefined()
    expect(Annotation).toBeDefined()
    expect(Send).toBeDefined()
    expect(END).toBeDefined()
    expect(START).toBeDefined()
  })

  it('imports @langchain/core/tools', async () => {
    const { DynamicStructuredTool } = await import('@langchain/core/tools')
    expect(DynamicStructuredTool).toBeDefined()
  })

  it('imports @langchain/core/messages', async () => {
    const { SystemMessage, HumanMessage } = await import('@langchain/core/messages')
    expect(SystemMessage).toBeDefined()
    expect(HumanMessage).toBeDefined()
  })

  it('imports @langchain/anthropic', async () => {
    const { ChatAnthropic } = await import('@langchain/anthropic')
    expect(ChatAnthropic).toBeDefined()
  })

  it('imports @langchain/openai', async () => {
    const { ChatOpenAI } = await import('@langchain/openai')
    expect(ChatOpenAI).toBeDefined()
  })

  it('imports @langchain/google-genai', async () => {
    const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai')
    expect(ChatGoogleGenerativeAI).toBeDefined()
  })

  it('imports @langchain/langgraph/prebuilt', async () => {
    const { createReactAgent } = await import('@langchain/langgraph/prebuilt')
    expect(createReactAgent).toBeDefined()
  })

  it('imports better-sqlite3', async () => {
    // better-sqlite3 is a native module — just verify it loads
    const Database = require('better-sqlite3')
    expect(typeof Database).toBe('function')
  })

  it('imports zod', async () => {
    const { z } = await import('zod')
    expect(z.string).toBeDefined()
  })
})
