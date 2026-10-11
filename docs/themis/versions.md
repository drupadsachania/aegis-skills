# Versions and compatibility

## Version stamp

Every run and every report carries `{ themis, aegis, osk }`:

- `themis` is the version of the shared Themis core (0.1.0 today).
- `aegis` is the version of the installed `aegis-skills` package (1.1.0 today).
- `osk` is the skill-format version read from the installed skills (1.1 today).

Standalone reports show it as `Themis 0.1.0 · Aegis 1.1.0 (osk 1.1)`, and `themis --version` prints the same facts. If Themis cannot find an `aegis-skills` package next to it, it records `unknown` rather than guessing.

## osk contract

The major version of `osk` is the contract between Aegis and Themis. Themis is built for osk major 1 and works with any Aegis release that keeps that major, so patch and minor updates to the skills are picked up automatically. A change of the osk major would need a new Themis release. Themis records the osk in every stamp, but today it does not refuse to run against another major, so check the stamp if you mix versions.

The tool names of the Aegis MCP server (`list_skills`, `get_skill`, `get_skill_phase`) are frozen for the same reason.

## Plugin vs app

- The plugin does not bundle skills. Its `.mcp.json` pins exact versions of both servers: `aegis-skills@1.1.0` and `@aegis-skills/themis-plugin@1.1.0`. The pins are exact because plugin directories do not accept version ranges; they are updated at each release. The Aegis skills it uses are the ones served by the `aegis` MCP server you have registered.
- The standalone app depends on `aegis-skills` (`^1.1.0`) and installs it with the app, so it always has a matching copy of the skills. Its Skills page shows the version and how fresh each skill's intel is.

## Package versions

| Package | Version |
|---|---|
| `aegis-skills` | 1.1.0 (osk 1.1) |
| `@aegis-skills/themis-core` | 0.1.0 |
| `@aegis-skills/themis-gateway` | 0.1.0 |
| `@aegis-skills/themis-plugin` | 1.1.0 |
| `@aegis-skills/themis` | 0.1.0 |

All packages require Node.js 24 or later. Nothing is published to npm yet.
