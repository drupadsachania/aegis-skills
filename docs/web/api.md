# Read-only HTTP API

The website exposes a small read-only API. It serves public skill content only and calls no model.

## Endpoints

| Method | Path | Returns |
|---|---|---|
| `GET` | `/api/skills` | `{ "skills": [...] }`: every skill with name, version, description, frameworks, tags, phase counts, whether it has live intel, and its recommendation context. |
| `GET` | `/api/<skill>/manifest` | One skill's manifest as JSON: description, family, frameworks, tags, ordered phases (id and token count) and context. No file paths. |
| `GET` | `/api/<skill>/phase/<phaseId>` | The text of one phase, as `text/markdown`. |
| `POST` | `/api/recommend` | The skills ranked by relevance. The body is `{ "environments": [...], "attack_surface_tags": [...] }`, each at most 20 strings, and the request body is limited to 4 KB. Each skill comes back with a `relevance_score`. |
| `POST`, `GET`, `DELETE` | `/api/mcp` | The hosted Aegis MCP server (see [Hosted MCP](./hosted-mcp.md)). |

Every endpoint above sends `Access-Control-Allow-Origin: *`, except `/api/mcp`, which sends no CORS headers.

## Examples

```bash
curl -s https://aegis-skills.vercel.app/api/skills

curl -s https://aegis-skills.vercel.app/api/compliance/manifest

curl -s https://aegis-skills.vercel.app/api/compliance/phase/scope-definition

curl -s -X POST https://aegis-skills.vercel.app/api/recommend \
  -H "content-type: application/json" \
  -d '{"environments":["cloud"],"attack_surface_tags":["api"]}'
```

## Errors

| Status | Body | When |
|---|---|---|
| 404 | `{ "error": "skill not found" }` | The skill name is unknown. |
| 404 | `{ "error": "phase not found" }` | The skill exists but the phase id does not. |
| 405 | `{ "error": "Method not allowed" }` | The method is not allowed for that path. |
| 400 | `{ "error": "Invalid request" }` | `/api/recommend` got a body that is missing, not arrays of strings, or longer than 20 items. |
| 413 | `{ "error": "Request too large" }` | `/api/mcp` got a request over 64 KB. |

Error messages never echo what you sent.

## Removed endpoints

These paths no longer exist:

- `POST /api/<skill>/invoke`: use `GET /api/<skill>/phase/<phaseId>`, or the MCP tool `get_skill_phase`.
- `/api/themis`, `/api/audit` and `/api/exposure`: the website no longer runs Themis. Use [Themis standalone](../themis/mode-2-app.md).
