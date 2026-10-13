# Aegis

## What Aegis is

Aegis is an open cybersecurity skill pack in the open [Agent Skills](https://agentskills.io/specification) format. It is content only: markdown and JSON, no model calls. The npm package is `aegis-skills` (version 1.5.0). It is licensed Apache-2.0 OR MIT.

The package also contains a small installer and a read-only MCP server, so the same skills can be installed into a coding assistant, served over MCP, or used as a single-file prompt in any chat AI.

## What's in the pack

There are 24 skills in five families.

| Family | Skills |
|---|---|
| Frameworks | `mitre-attack`, `mitre-atlas`, `mitre-engage` |
| Threat Intel | `threat-intel-synthesis`, `threat-hunting`, `threat-modeling`, `attack-surface-mapping`, `exposure-validation` |
| Response & Analysis | `security-operations`, `digital-forensics`, `malware-analysis`, `reverse-engineering` |
| Domain Defence | `application-security`, `network-security`, `endpoint-security`, `infrastructure-security`, `identity-access-management`, `operational-technology`, `data-loss-prevention`, `deception-engineering` |
| Governance & Risk | `compliance`, `governance`, `risk-management`, `security-documentation` |

Browse them on the [skill catalogue](/skills).

## How a skill is built

`SKILL.md` holds the overview and a small frontmatter block. It links to phase files in `references/`, so an assistant loads only the phase it needs (progressive disclosure). `skill.json` is the machine-readable sidecar that lists the phases, frameworks and tags. See [Skill format](./skill-format.md).

## Ways to use it

| Path | For | How |
|---|---|---|
| Zero install | Anyone, in any chat AI | Copy a single-file prompt or download a skill zip. |
| Hosted MCP | Claude.ai, ChatGPT and any MCP client | Connect to the hosted, read-only Aegis MCP server. |
| Skill pack | Coding assistants | Install every skill into your assistant's native skills folder. |
| Themis on your AI | Claude Code, Codex, Gemini CLI | Install the Themis plugin. Your assistant is the model, so no API key is needed. |
| Themis standalone | A local SOC dashboard | Run Themis with its own web UI on 127.0.0.1, using your own key or a local model. |

Step-by-step commands for each path are on [Choose your path](/paths). The npm and marketplace installs open with the first release; nothing is published yet.

## Safety

Every skill has a `## Scope and authorization` section. Skills are for systems you own or are explicitly authorized to assess, and each skill states what is out of scope. The repository's lint step fails if the section is missing.
