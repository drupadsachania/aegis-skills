# Aegis Security Skills

24 defensive cybersecurity skills for Claude Code, in the open Agent Skills format: MITRE ATT&CK, ATLAS and Engage mapping, threat hunting, digital forensics, exposure validation, identity and access management, endpoint, network and infrastructure security, operational technology, compliance, governance and risk.

Every skill opens with a scope-and-authorization section: a defensive purpose, an assumption that you only use it on systems you own or are explicitly authorized to assess, and what it will not do. The skills are guidance. They do not run scans or change anything.

## Install

```
/plugin marketplace add drupadsachania/aegis-skills
/plugin install aegis-skills@aegis-skills
```

## What it contains

- 24 skills, each split into methodology phases that your assistant loads only when needed.
- A read-only hosted MCP server (`list_skills`, `get_skill`, `get_skill_phase`) that serves the same public skill text. It needs no account and no API key.

## Privacy

The plugin makes no network requests of its own. The MCP server returns public skill content and keeps no record of your requests; it only holds a short-lived in-memory counter to limit bursts. Read the full [privacy policy](https://aegis-skills.vercel.app/docs/themis/privacy-policy) and the [data-flow page](https://aegis-skills.vercel.app/trust).

## Support and licence

Website: https://aegis-skills.vercel.app. Issues: https://github.com/drupadsachania/aegis-skills/issues. Security reports: use GitHub private vulnerability reporting. Licensed Apache-2.0 OR MIT.
