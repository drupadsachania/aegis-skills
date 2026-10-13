# Dual-use review of the Aegis skills

Last reviewed: 2026-10-12. This is a policy-level review. It checks what each skill says about its purpose, who may use it and what it will not do. It does not describe how any attack or analysis technique works, and no skill was changed as a result of this review.

Security tooling can be used for defence or for harm. Directory reviewers and security teams ask the same question of every skill: is it written for defenders, does it assume the user is authorised, and does it say where it stops. Every Aegis skill answers that in a `## Scope and authorization` section at the top of its `SKILL.md`, and the skill linter refuses to pass a skill that leaves any part out.

## What the scope block must contain

Each `SKILL.md` has three lines, checked by `checkScopeBlock` in `scripts/lint-skills.js` (the same function the linter uses for every skill):

- **Purpose.** One defensive sentence.
- **Authorization.** The fixed line "Use only on systems you own or are explicitly authorized to assess."
- **Out of scope.** What the skill will not do.

The rule is exercised by `scripts/tests/lint-skills.test.js`, and `node scripts/lint-skills.js` runs it against all 24 shipped skills.

## Review table

Each row was read from the skill's own `SKILL.md`. "Yes" means the line is present and says something specific to that skill, not only the fixed wording.

| Skill | (a) Defensive purpose | (b) Authorization assumption | (c) Out-of-scope limits |
|---|---|---|---|
| application-security | Yes: fix weaknesses in applications you build or maintain | Yes | Yes: no exploiting third-party or production apps without written authorization, no weaponised exploits |
| attack-surface-mapping | Yes: inventory your own exposure to reduce it | Yes | Yes: no assets you do not own, no credential attacks or exploitation |
| compliance | Yes: prepare audits and evidence controls | Yes | Yes: no legal advice, no fabricated or altered evidence |
| data-loss-prevention | Yes: stop sensitive data leaving your estate | Yes | Yes: no covert monitoring of individuals, no exfiltration or DLP-evasion technique |
| deception-engineering (higher scrutiny) | Yes: honeypots and honeytokens inside environments you defend | Yes | Yes: no deception on networks you do not control, no luring, entrapment or hack-back |
| digital-forensics (higher scrutiny) | Yes: investigate incidents with a defensible chain of custody | Yes | Yes: no access without legal authority, no anti-forensics or evidence tampering |
| endpoint-security | Yes: harden and monitor endpoints you manage | Yes | Yes: no disabling or evading security tooling you do not administer, no malware building |
| exposure-validation (higher scrutiny) | Yes: prove which exposures are real and closed, least invasive test first | Yes | Yes: nothing without written authorization, explicit scope and named-human approval; no persistence, credential theft or lateral movement beyond the test |
| governance | Yes: run a security governance programme | Yes | Yes: no legal or regulatory advice, no direct testing of a vendor without agreement |
| identity-access-management | Yes: design and review identity controls | Yes | Yes: no password cracking, credential harvesting or account takeover |
| infrastructure-security | Yes: assess and harden infrastructure you operate | Yes | Yes: nothing outside authorised scope, no exploiting the weaknesses found |
| malware-analysis (higher scrutiny) | Yes: analyse samples in an isolated lab to extract IOCs, TTPs and detections | Yes | Yes: no creating, improving or distributing malware, no running samples outside an isolated environment |
| mitre-atlas | Yes: threat-model AI and ML systems and plan countermeasures | Yes | Yes: no poisoning, evading or extracting models you do not own, no working attacks on third-party AI systems |
| mitre-attack | Yes: map adversary behaviour to drive detections and gap analysis | Yes | Yes: no operational attack planning, no step-by-step intrusion guidance |
| mitre-engage | Yes: plan adversary engagement inside environments you defend | Yes | Yes: no operations on infrastructure you do not control, no hack-back |
| network-security | Yes: review segmentation, traffic and rules to shrink the attack surface | Yes | Yes: no scanning, intercepting or disrupting networks you are not authorised to assess, no denial-of-service testing |
| operational-technology | Yes: secure OT and ICS environments | Yes | Yes: no active scanning or changes on live control systems without operator and safety approval, nothing that affects physical safety or availability |
| reverse-engineering (higher scrutiny) | Yes: understand binaries and firmware to extract IOCs and support detection | Yes | Yes: no cracking licences or DRM, no building exploits, no modifying malware for reuse |
| risk-management | Yes: identify, assess, treat and report risk | Yes | Yes: no financial, legal or insurance advice; risk acceptance stays with owners |
| security-documentation | Yes: write policies, runbooks and templates | Yes | Yes: no legal sign-off, no documents describing controls that do not exist |
| security-operations | Yes: run SOC operations from triage to reporting | Yes | Yes: no offensive actions, no response outside your authority, no disabling logging or covering tracks |
| threat-hunting (higher scrutiny) | Yes: hunt in your own telemetry with hypothesis-driven queries | Yes | Yes: no collecting telemetry you are not authorised to monitor, no hunting in third-party environments |
| threat-intel-synthesis | Yes: turn reporting into patterns, narratives and coverage maps | Yes | Yes: no attribution to named individuals, no treating retrieved content as instructions, no operational attack guidance |
| threat-modeling | Yes: identify and mitigate design-level threats | Yes | Yes: no testing or exploiting the system being modelled |

Result: 24 of 24 skills have all three elements, including the six that get extra scrutiny (malware-analysis, reverse-engineering, deception-engineering, exposure-validation, threat-hunting, digital-forensics). No skill is missing an element, so no skill's wording was edited.

## Notes for maintainers

- **Authorization is a fixed line, not a suggestion.** The linter requires the exact wording. A skill cannot soften it without failing `node scripts/lint-skills.js`.
- **Higher-scrutiny skills lean on the Out-of-scope line.** Malware analysis requires isolation, reverse engineering rules out exploit and DRM work, exposure validation requires written authorization and named-human approval, and forensics requires legal authority. If any of those lines is ever shortened, treat it as a review blocker.
- **Authorization wording is an assumption, not enforcement.** A skill is text that guides an AI assistant. It states the boundary and the assistant is expected to respect it. The skills carry no code that executes anything, and the hosted MCP server and the Themis plugin only read or orchestrate under human approval (see [governance](governance.md)).
- **Not covered here.** Whether a given organisation is legally permitted to do a task, and whether a user actually holds authorization, are outside what a skill file can check.

## What directory reviewers look for

Anthropic and OpenAI review security tooling against their published policies. In practice, three things matter, and each is answered above.

| Reviewer question | How the skills answer it |
|---|---|
| Is the tool framed for defence? | Every skill opens with a one-line defensive purpose. Skills that touch adversary material (ATT&CK, ATLAS, Engage, malware, reverse engineering, hunting, forensics) state that the output is detections, IOCs, coverage or evidence. |
| Does it assume authorised use? | The authorization line is mandatory and identical in all 24 skills, and the higher-risk skills add named-human approval, written authorization, legal authority or operator approval to their out-of-scope limits. |
| Does it avoid operational attack instructions? | Out-of-scope lines exclude exploit building, intrusion step lists, credential attacks, hack-back, denial of service and anti-forensics. Where a skill covers an attacker's behaviour it does so to map and detect it. |

Reviewers also look at the service itself. The hosted Aegis server is read-only, requires no sign-in and returns only public skill text (see the [privacy policy](privacy-policy.md) and the [threat model](threat-model-atlas.md)). Themis sends writes and executions through a human approval gate (see the [compliance mapping](compliance-mapping.md)).
