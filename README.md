# OpenSkill

**Platform-agnostic AI skill compiler.** Write once in `SKILL.md`, deploy to ChatGPT, Gemini, Claude, Mistral, and any MCP-compatible dev tool.

## MITRE Suite

Four flagship skills for defensive security:

| Skill | Framework | Purpose |
|---|---|---|
| `mitre-attack` | ATT&CK | Adversary TTP mapping |
| `mitre-engage` | Engage | Deception activity planning |
| `deception-engineering` | Engage + ATT&CK | Deploy honeypots and honeytokens |
| `mitre-atlas` | ATLAS | AI/ML attack surface defence |

## Quick Start

```bash
npm install -g @openskill/compiler

# Validate a skill
openskill validate ./skills/deception-engineering

# Compile to all platform artifacts
openskill compile ./skills/deception-engineering

# Output:
#   artifacts/system-prompt.txt     ← paste into ChatGPT / Gemini / Claude
#   artifacts/mcp-manifest.json     ← connect Claude Desktop / Cursor / VS Code
#   artifacts/openai-action.json    ← configure as a GPT Action
#   artifacts/skill.json            ← machine manifest
```

## Skill Format

Skills are `SKILL.md` files with extended YAML frontmatter:

```yaml
---
name: my-skill
version: 1.0.0
description: What this skill does and when to use it.
frameworks: [mitre-attack]
tags: [security]
phases:
  - id: phase-one
    ref: references/phase-one.md
    lazy: true
tools: [read, search]
platforms:
  openai: { model: gpt-4o }
  anthropic: { model: claude-sonnet-4-6 }
---
```

## Artifacts

The compiler emits four artifacts per skill:

| Artifact | Use |
|---|---|
| `system-prompt.txt` | Paste into any chat UI (ChatGPT, Gemini, Claude Projects, Mistral) |
| `mcp-manifest.json` | Connect Claude Desktop, Cursor, VS Code, or any MCP client |
| `openai-action.json` | Configure as a Custom GPT Action for lazy phase loading |
| `skill.json` | Machine manifest — registry metadata, endpoints, token counts |

## License

MIT — see [LICENSE](LICENSE)
