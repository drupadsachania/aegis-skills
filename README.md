# Aegis

**Platform-agnostic AI skill compiler for defensive security.** Write once in `SKILL.md`, deploy to ChatGPT, Gemini, Claude, Mistral, and any MCP-compatible dev tool.

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
npm install -g @aegis/compiler
aegis compile skills/my-skill --base-url https://your-deployment.vercel.app
```

## Marketplace

Live at: `https://project-iud7o.vercel.app`

## API

| Endpoint | Method | Description |
|---|---|---|
| `/api/skills` | GET | List all skills |
| `/api/:skill/manifest` | GET | Skill manifest JSON |
| `/api/:skill/invoke` | POST | Invoke a phase |
| `/api/:skill/phase/:id` | GET | Phase content |
| `/api/recommend` | POST | Recommend skills by context |

## Security

See `docs/superpowers/specs/` for security audit findings and mitigations.

## License

MIT © Drupad Sachania
