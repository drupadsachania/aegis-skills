# Aegis Security Skills

24 defensive cybersecurity skills in the open Agent Skills format: MITRE ATT&CK, ATLAS and Engage mapping, threat hunting, DFIR, exposure validation, attack surface mapping, identity, endpoint, network and OT security, compliance and risk.

Every skill states its defensive purpose, an authorization assumption (use it only on systems you own or are authorized to assess) and what it will not do. This package is guidance for defenders. The skills do not run scans, execute anything or reach other systems on their own.

The bundled MCP server is read-only. It exposes three tools, `list_skills`, `get_skill` and `get_skill_phase`, that return the public skill content from `https://aegis-skills.vercel.app/api/mcp`. It needs no account or sign-in, holds no user data, and never calls a model.

- Skills: `skills/<name>/SKILL.md`, with supporting material in `skills/<name>/references/`.
- MCP server: `mcp.json` (read-only, no authentication).
- Website and documentation: https://aegis-skills.vercel.app
- Source: https://github.com/drupadsachania/aegis-skills
- Licence: Apache-2.0 OR MIT (see `LICENSE`, `LICENSE-APACHE`, `LICENSE-MIT`).
