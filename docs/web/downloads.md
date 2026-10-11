# Downloads

## Files

For every skill `<name>` the site serves two files:

| File | URL | Contents |
|---|---|---|
| Single-file prompt | `/downloads/prompts/<name>.md` | The skill body and every phase in one markdown file, starting with an `Intel as of YYYY-MM-DD` line. |
| Skill zip | `/downloads/skills/<name>.zip` | `<name>/SKILL.md`, `<name>/skill.json` and `<name>/references/*.md`. Nothing else. |

## index.json

`/downloads/index.json` lists everything:

```json
{
  "aegisVersion": "1.1.0",
  "skills": [
    {
      "name": "compliance",
      "version": "1.1.0",
      "intelAsOf": "2026-08-18",
      "prompt": "/downloads/prompts/compliance.md",
      "zip": "/downloads/skills/compliance.zip",
      "promptBytes": 29859,
      "zipBytes": 15403,
      "zipSha256": "0d9065972378f27d1aa1dab182689966ff924b5760e99b95d26e87de82344595"
    }
  ]
}
```

| Field | Meaning |
|---|---|
| `aegisVersion` | Version of the `aegis-skills` package the files were built from. |
| `name`, `version` | The skill and its version. |
| `intelAsOf` | Date of the skill's last intel sync (`YYYY-MM-DD`), or `null` if unknown. |
| `prompt`, `zip` | Site paths of the two files. |
| `promptBytes`, `zipBytes` | File sizes in bytes. |
| `zipSha256` | SHA-256 of the zip, as lowercase hex. |

The numbers above change with each build.

## How they are built

The `prebuild` script `apps/web/scripts/build-downloads.js` runs before every build and before `npm run dev`. It flattens each skill with `scripts/build-flat-prompts.js`, writes each zip with a dependency-free zip writer built on `node:zlib`, and writes everything to `apps/web/public/downloads/`. That folder is generated on every build and is never committed.

## Reproducibility

Zip timestamps are fixed to 1980-01-01, so the same skill content produces byte-identical zips. Compare the SHA-256 of a downloaded zip with `zipSha256` to verify it.
