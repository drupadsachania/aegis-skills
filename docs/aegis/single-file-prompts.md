# Single-file prompts and skill zips

## What they are

A single-file prompt is one skill with every phase flattened into one markdown file. Its first lines carry the skill name and version and an `Intel as of YYYY-MM-DD` stamp, so you can see how fresh the content is.

A skill zip contains `<name>/SKILL.md`, `<name>/skill.json` and `<name>/references/*.md`, which is the layout that tools with a skill uploader expect.

## Where to get them

- Every [skill page](/skills) has Copy prompt, Download .md and Download .zip.
- The URLs are stable: `/downloads/prompts/<name>.md` and `/downloads/skills/<name>.zip`.
- A machine-readable index is at `/downloads/index.json` (see [Downloads](../web/downloads.md)).

## Claude.ai

Upload the zip at Settings → Capabilities → Skills → Upload skill. Or paste the prompt into a Project's instructions.

## ChatGPT, Gemini and other chat AIs

Add the `.md` file to a Project, a Gem or a custom assistant, or attach it to a chat and ask the AI to follow it. Or paste the prompt as your first message.

## Freshness

The files are regenerated on every deploy of the website, and skill content is updated monthly. A downloaded copy does not update itself. For always-current content, use the [hosted MCP server](../web/hosted-mcp.md) or the [skill pack](./install.md), which refreshes after upgrades.

## Size

Prompts are large: today they range from about 11 KB to about 67 KB. If your tool truncates long input, use the zip, or the MCP server, which loads one phase at a time.
