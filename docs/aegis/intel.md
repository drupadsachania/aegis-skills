# Live threat intel

## How it works

Aegis skills carry a short block of current threat observations next to their hand-written methodology. The maintainers collect threat-intelligence articles and attack breakdowns, extract the patterns (CVEs, ATT&CK and ATLAS technique ids, actors), and route each item to the skills whose attack surface it affects. A web-application flaw goes to application security, a stolen-token incident goes to identity and access management, and one item can land in several skills. Skill content is updated monthly.

## Where it lives

- Each skill's `references/live-threat-intel.md` holds the block. It is an `auto` phase in `skill.json`, and the site and MCP server mark it LIVE.
- The generated text sits between marked begin and end comments in its own file. The hand-written tradecraft in the other reference files is never edited by this process.
- `intel-state.json` records the last sync date and how many items were routed. It lives in the repository only and is never shipped in the npm package, the zips or installed skills.

## Intel as of

Every single-file prompt starts with an `Intel as of YYYY-MM-DD` line, taken from the skill's last sync date. The Skills page of the Themis dashboard shows the same date and marks a skill `stale` when it is older than 30 days or unknown. See [Single-file prompts](./single-file-prompts.md).

## Releases

Updated skill content reaches you in a new Aegis version. Themis accepts any installed Aegis whose `osk` major version matches, so it picks up these updates automatically (see [Versions and compatibility](../themis/versions.md)). A downloaded prompt or zip does not update itself; fetch it again, or use the [hosted MCP server](../web/hosted-mcp.md).
