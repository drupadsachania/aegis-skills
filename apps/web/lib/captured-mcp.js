'use strict'

// Real output of the Aegis MCP tools, captured at build time by running the actual server code
// (packages/aegis/mcp/server.js) in-process over the SDK's in-memory transport. Nothing here is
// typed by hand: the quick start page shows exactly what a client receives, trimmed only where
// stated. The hosted endpoint serves this same factory (apps/web/app/api/mcp/route.ts).
//
// Build-time only: call from getStaticProps. The MCP SDK is required lazily so no page bundles it.

const EXAMPLE_SKILL = 'exposure-validation'
const EXAMPLE_QUERY = 'exposure'

// get_skill returns a long description, tags and context; the page omits those and says so.
const GET_SKILL_KEEP = ['name', 'version', 'family', 'frameworks', 'phases']

function trimGetSkill (json) {
  const parsed = JSON.parse(json)
  const kept = Object.fromEntries(GET_SKILL_KEEP.filter(k => k in parsed).map(k => [k, parsed[k]]))
  return { text: JSON.stringify(kept, null, 2), omitted: Object.keys(parsed).filter(k => !GET_SKILL_KEEP.includes(k)) }
}

async function captureAegisMcp () {
  const { Client } = require('@modelcontextprotocol/sdk/client/index.js')
  const { InMemoryTransport } = require('@modelcontextprotocol/sdk/inMemory.js')
  const { createAegisMcpServer } = require('aegis-skills/mcp/server')

  const server = createAegisMcpServer()
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const client = new Client({ name: 'aegis-site-capture', version: '1.0.0' })
  try {
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
    const list = await client.callTool({ name: 'list_skills', arguments: { query: EXAMPLE_QUERY } })
    const get = await client.callTool({ name: 'get_skill', arguments: { name: EXAMPLE_SKILL } })
    const all = await client.callTool({ name: 'list_skills', arguments: {} })
    const trimmed = trimGetSkill(get.content[0].text)
    return {
      skillCount: JSON.parse(all.content[0].text).count,
      list: { call: { name: 'list_skills', arguments: { query: EXAMPLE_QUERY } }, text: list.content[0].text },
      get: { call: { name: 'get_skill', arguments: { name: EXAMPLE_SKILL } }, text: trimmed.text, omitted: trimmed.omitted }
    }
  } finally {
    await client.close().catch(() => {})
    await server.close().catch(() => {})
  }
}

module.exports = { captureAegisMcp, EXAMPLE_SKILL, EXAMPLE_QUERY, trimGetSkill }
