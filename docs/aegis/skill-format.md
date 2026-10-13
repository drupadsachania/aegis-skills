# Skill format

Aegis skills follow the open [Agent Skills](https://agentskills.io/specification) format. Each skill is a folder with `SKILL.md`, `skill.json` and a `references/` folder. Everything is markdown or JSON.

## SKILL.md

The frontmatter holds only these top-level keys: `name`, `description`, `license` and `metadata`. The lint also accepts the standard optional keys `compatibility` and `allowed-tools`. Anything else is rejected.

```yaml
---
name: compliance
description: >-
  End-to-end security compliance workflow covering scope definition, ...
  Triggers for: compliance audit preparation, control gap assessment, ...
license: Apache-2.0 OR MIT
metadata:
  version: "1.1.0"
  osk: "1.1"
  family: "governance"
---
```

- `name` equals the folder name: lowercase letters, digits and single hyphens, up to 64 characters.
- `description` is at most 1024 characters and says what the skill does and when to use it.
- `metadata` values are strings.

## Phases

The body of `SKILL.md` links each phase as a relative markdown link into `references/`, for example `[Scope definition](references/scope-definition.md)`. An assistant reads the overview first and opens a phase only when it needs it. The linked files must exist and must stay inside the skill folder.

## skill.json

The sidecar carries everything structured. Important fields: `osk`, `name`, `version`, `description`, `family`, `phases` (each with `id`, `file`, `tokens`, and `auto: true` for generated intel), `frameworks`, `tags`, `research`, `self-learning` (intel settings) and `context` (environments, industry verticals and attack-surface tags, used for recommendations). Readers ignore fields they do not know. A trimmed example from the `compliance` skill:

```json
{
  "osk": "1.1",
  "name": "compliance",
  "version": "1.1.0",
  "family": "governance",
  "frameworks": ["nist-csf", "cis-controls", "iso-27001", "pci-dss"],
  "phases": [
    { "id": "scope-definition", "file": "references/scope-definition.md", "tokens": 1234 },
    { "id": "standard-mapping", "file": "references/standard-mapping.md", "tokens": 1654 }
  ]
}
```

## Scope and authorization

Every `SKILL.md` body contains this section, and the lint requires all three lines:

```markdown
## Scope and authorization
- Purpose: <one line, defensive>
- Use only on systems you own or are explicitly authorized to assess.
- Out of scope: <what this skill will not do>
```

## osk versions

`osk` is the version of the skill format, currently `1.1`. Its major version is the contract between Aegis and Themis: Themis accepts any installed Aegis whose `osk` major is the same. See [Versions and compatibility](../themis/versions.md).

## Lint

`npm run lint:skills` checks the frontmatter keys, that the name matches the folder, the description length, that `skill.json` agrees with `SKILL.md`, that every phase file exists and is linked, the token budgets, and the scope-and-authorization section. The budgets are 5000 tokens for the body, 4000 per phase and 16000 for all phases of a skill.
