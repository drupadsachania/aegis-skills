# Aegis MCP server

## Tools

The server offers three tools. All three are read-only and carry the MCP hints `readOnlyHint: true` and `destructiveHint: false`.

| Tool | Arguments | Returns |
|---|---|---|
| `list_skills` | `query` (optional text, up to 200 characters), `family` (optional: `framework`, `intel`, `response`, `domain` or `governance`) | Each skill's name, family, one-sentence summary, phase count and whether it has live intel. |
| `get_skill` | `name` (skill slug, for example `exposure-validation`) | Description, frameworks, tags, context and the ordered phase ids. |
| `get_skill_phase` | `name`, `phase` (a phase id such as `edr-deployment`, or its 0-based index among authored phases) | The full text of that phase. Text over 20,000 characters is truncated and marked `[truncated]`. |

Tool names are frozen because Themis depends on them.

## Run it locally (stdio)

Add this to your MCP client's config. It works after the first release of the `aegis-skills` package:

```json
{
  "mcpServers": {
    "aegis": {
      "command": "npx",
      "args": ["-y", "aegis-skills", "mcp"]
    }
  }
}
```

If you installed the package globally, use `"command": "aegis"` with `"args": ["mcp"]`. `aegis install` registers the server for you on the platforms it supports (see [Install Aegis](./install.md)).

## Use the hosted server

The same tools are served over Streamable HTTP at `https://aegis-skills.vercel.app/api/mcp`, with no install. See [Connect to the hosted Aegis MCP](./hosted-mcp.md).

## Guarantees

- No model calls.
- Only public skill content is served; nothing is written, executed or fetched from the network.
- Skill names and phase ids are validated, and no file paths are exposed.
- The runtime dependencies of the whole package are `@modelcontextprotocol/sdk`, `zod` and `gray-matter`.
