# Connect to the hosted Aegis MCP

## Endpoint

```
https://aegis-skills.vercel.app/api/mcp
```

It speaks MCP over Streamable HTTP. It is stateless (no sessions) and needs no authentication. Requests over 64 KB are rejected. The server offers the three read-only tools `list_skills`, `get_skill` and `get_skill_phase` (see [Aegis MCP server](../aegis/mcp.md)).

## Claude.ai

Settings → Connectors → Add custom connector. Name it Aegis and paste this URL:

```
https://aegis-skills.vercel.app/api/mcp
```

## ChatGPT

Settings → Apps & Connectors → Advanced settings → turn on Developer mode. Create a connector, paste this URL and choose "No authentication".

```
https://aegis-skills.vercel.app/api/mcp
```

## Claude Code

```bash
claude mcp add --transport http aegis https://aegis-skills.vercel.app/api/mcp
```

## Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "aegis": {
      "url": "https://aegis-skills.vercel.app/api/mcp"
    }
  }
}
```

## VS Code

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "aegis": {
      "type": "http",
      "url": "https://aegis-skills.vercel.app/api/mcp"
    }
  }
}
```

## Other clients

Any client that speaks MCP Streamable HTTP works. No authentication, no session. Use the URL above.

## Check it works

```bash
curl -s -X POST https://aegis-skills.vercel.app/api/mcp \
  -H "content-type: application/json" \
  -H "accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

The reply lists three tools: `list_skills`, `get_skill` and `get_skill_phase`.

## Privacy

The server writes no application logs, runs no analytics and has no accounts. Vercel's standard platform request logs apply.

## Prefer local?

You can run the same server on your own machine over stdio. See [Aegis MCP server](../aegis/mcp.md).
