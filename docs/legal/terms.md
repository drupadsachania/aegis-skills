# Terms of Service

Version 1.4. Last updated: 2026-10-13.

**Maintainer:** Drupad Sachania  
**Project contact:** [support@kairos-foundation.org](mailto:support@kairos-foundation.org)  
**Privacy contact:** [privacy@kairos-foundation.org](mailto:privacy@kairos-foundation.org)

Aegis and Themis are independent open-source projects maintained by the person identified above (the **Maintainer**). The contact addresses use the kairos-foundation.org domain, which is a project and domain label only: it does not stand for an incorporated foundation or any other separate legal entity, and these Terms do not create one.

These Terms apply to the Aegis & Themis website at <https://aegis-skills.vercel.app/> (the **Website**) and the hosted, read-only Aegis Model Context Protocol endpoint at <https://aegis-skills.vercel.app/api/mcp> (the **Hosted MCP Service**). Together, those are the **Hosted Services**. Read these Terms alongside the [Privacy Policy](/docs/themis/privacy-policy), [Security Policy](/security), [Trust and data flow](/trust), and [Licence page](/license). Downloaded source code and skill content are governed by their applicable open-source licence. Software you run locally is not a hosted service and is not made subject to additional restrictions by these Terms; its licence and any third-party terms apply.

The Hosted Services are free community resources. They are not a managed security service, professional consultancy, incident-response provider, compliance certification, or guarantee that any suggested action is safe or effective.

## 1. What the projects provide

### 1.1 Aegis

At the time of this draft, Aegis contains 24 defensive security skills and 147 methodology phases across five families: frameworks (including MITRE ATT&CK, ATLAS and Engage), threat intelligence, response and analysis, domain defence, and governance and risk. Skills include their own scope and authorisation guidance. Counts, content and version numbers may change as the project is updated.

The Website provides public documentation, single-file prompts, skill ZIP downloads, and related project information. The Hosted MCP Service is read-only and currently exposes three tools: `list_skills`, `get_skill`, and `get_skill_phase`. It returns public skill content; it is not an execution environment and does not itself perform scans or changes on your systems.

The `aegis` CLI currently supports installation into Claude, Codex, Gemini, Cursor, VS Code and Antigravity, and `aegis mcp` can run a local MCP server. Integrations may change with the supported clients. Local installations and local MCP use are governed by the applicable open-source licence and the configuration of your own environment.

### 1.2 Themis

Themis is an in-development security-operations agent that plans a task, applies Aegis skills, and reports results with human oversight. Its intended seven-step workflow validates, decomposes, schedules, fans out, applies guardrails, synthesises, and audits. The design routes external tool calls through per-skill allowlists (default deny), classifies reads versus writes, applies call budgets and secret redaction, wraps untrusted output, audits steps and tool calls, and is designed to require human approval for writes and execution where enforced by the execution path. Reports identify the Themis and Aegis versions. These are design descriptions, not a guarantee that every safety control will operate correctly in every environment.

The current repository build has two intended modes. The **plugin mode** exposes an MCP server with ten tools and connects to an AI client chosen by the user; the plugin does not require a separate model API key of its own, although the connected client may require its own setup. Approval requests are intended to use the client's prompt; if the client cannot provide that approval path, the action should be handed back to the user rather than silently performed. The **standalone mode** provides `themis dashboard`, a local web UI intended to listen on `127.0.0.1:9120` with token protection, and `themis run` for headless execution. It can be configured for Anthropic, OpenAI, Google, or a local model through Ollama or LM Studio. These capabilities are in development and may change.

Themis is currently developed from the repository and is not yet published as a general package or hosted service. It is described here for clarity; these Terms do not promise its availability, maturity, feature set, compatibility, security controls, or future release. When run locally, it is software on your device, not a service operated for you by the Maintainer.

The current development build is designed to store its local data under `~/.themis` and not to add telemetry. This is a statement of current design intent, not a guarantee about every future version, dependency, configured model provider, or other application. If you configure a cloud model, prompts and other data sent to that model may leave your device and be processed by its provider. Verify the code, settings, and release documentation you actually run.

### 1.3 Third-party AI and clients

The Hosted Services do not themselves call an AI model. If you paste skill content into an AI assistant, connect the Hosted MCP Service to an AI client, or run Themis with a model you choose, the client or model provider may receive the prompts, content, metadata, and instructions you send. Cloud providers operate under their own terms and privacy practices. A local model may reduce external transmission, depending on your configuration, but you are responsible for verifying the actual data flow.

## 2. Open-source licensing and project identity

The repository identifies the applicable project source code and skill content as licensed under **Apache-2.0 OR MIT**, at the recipient’s option, subject to the relevant licence files and notices. Check the licence attached to the specific file before reuse. Third-party files, assets, fonts, trademarks and services may have separate terms.

The applicable open-source licence governs the rights and conditions for copying, modifying, and distributing the licensed Work. If these Terms conflict with a permission or condition of the applicable licence as to that Work, the licence controls to the extent of the conflict. These Terms govern access to the Hosted Services, including their availability, rate limits and protection against misuse; they do not rewrite the open-source licence.

The open-source licences already provide their own warranty and liability disclaimers for the licensed Work. Nothing in these Terms purports to expand a contributor’s obligations or make a contributor a party to an agreement they did not enter.

Aegis, Themis, logos, and other project marks are not granted as your own brand and must not be used to falsely suggest sponsorship, affiliation, or endorsement. This does not prevent truthful descriptive references to the project or rights granted by law.

## 3. Responsible use of the Hosted Services

Aegis and Themis address security topics that can be dual-use. The materials are intended to support defensive analysis and authorised security work. You are responsible for understanding applicable law and obtaining whatever permission is required before testing, scanning, accessing, modifying, or acting on systems, networks, accounts or data.

Do not use the Hosted Services to conduct unlawful activity, access or test systems without authorisation, exfiltrate data, harm or harass people, circumvent the Hosted Services’ rate limits or access controls, or interfere with the availability or security of the Hosted Services. The Maintainer does not verify every user’s identity or authorisation and does not promise to monitor every use.

The source code and skill content are offered under their stated open-source licences. This section sets rules for use of the Hosted Services; it is not intended to impose additional purpose restrictions on rights already granted by an applicable open-source licence for downloaded or self-hosted Work.

The Maintainer may throttle, reject, restrict or suspend access to the Hosted Services where reasonably necessary to protect the service, address abuse, respond to a security issue, or comply with law. Where reasonably practicable, reports of abuse may be sent to the project contact. The absence of monitoring, a response or enforcement does not mean an activity is authorised or approved.

Before using a skill or agent in a live environment, assess its scope and potential impact; use least-privilege access; protect credentials; maintain backups and change controls; and test in a controlled environment where practicable. Do not run commands, make production changes, or authorise automated actions solely because a prompt, skill, agent or model recommended them.

## 4. No warranty; experimental security guidance

The Website and Hosted MCP Service, and all content they provide, are supplied **“AS IS” and “AS AVAILABLE”**, without promises of any kind, to the fullest extent permitted by applicable law. The Maintainer disclaims warranties and conditions, whether express, implied or statutory, including accuracy, completeness, fitness for a particular purpose, merchantability, non-infringement, availability, security, compatibility, and error-free operation, to the extent those disclaimers are lawful.

The project is experimental and may be incomplete, changing, outdated, or incorrect. Testing of a skill or agent does not guarantee correctness, safety, security, suitability for your environment, or fitness for production use. Model outputs can be incomplete, misleading, inconsistent, or wrong. A suggested action may cause disruption, data loss, exposure, outages, or other harm.

You decide whether to use the project and how to act on its content. You are responsible for validating outputs and commands, checking scope and authorisation, evaluating risk, protecting data and credentials, making backups, and obtaining qualified professional advice where needed. The project does not provide managed security operations, incident response, legal advice, compliance advice, or certification.

## 5. Limitation of liability

To the fullest extent permitted by applicable law, the Maintainer disclaims responsibility for loss or damage arising from or related to the Hosted Services, the licensed Work, its content or outputs, its use or inability to use it, service interruptions, errors, vulnerabilities, third-party services, or decisions and actions taken in reliance on it. This applies to claims under contract, tort (including negligence), statute or another legal theory, to the extent such exclusion is permitted by law.

To the fullest extent permitted by law, the Maintainer will not be liable for indirect, incidental, special, exemplary, punitive or consequential losses, or for loss of profits, revenue, business, contracts, goodwill, data, system availability, reputation, anticipated savings, remediation costs, or business interruption, even if the possibility of such loss was known.

The Hosted Services are currently provided free of charge. No warranty, service level, support commitment, indemnity, or assumption of additional liability is offered unless the Maintainer expressly agrees to it in a separate written agreement. The open-source licences separately govern liability disclaimers for licensed code and content.

Nothing in these Terms excludes or limits a liability, right, remedy or obligation to the extent applicable law does not permit it to be excluded or limited. These disclaimers seek the maximum lawful allocation of risk; they do not guarantee that the Maintainer can never be liable or that a court will enforce every exclusion in every circumstance.

## 6. Availability, limits and changes to the Hosted Services

The Hosted Services have no guaranteed uptime, availability, support response time, maintenance window, or service-level agreement. The Maintainer may change, restrict, suspend or discontinue them without notice where reasonably necessary, subject to applicable law.

The Hosted MCP Service currently applies best-effort limits of 120 requests per minute per IP address and rejects request bodies larger than 64 KB. Requests exceeding a limit may be refused or return an error. These limits may change for security, reliability or fair access. Do not bypass or attempt to evade them.

If you need private, heavy, guaranteed or availability-critical use, consider running the licensed project locally. Local operation removes dependence on the Hosted MCP Service but remains your responsibility to secure, maintain, configure, and validate.

## 7. Privacy and third-party processing

The Website does not require an account and is intended not to set cookies or run analytics. The Hosted MCP Service is designed to use a short-lived in-memory counter for rate limiting rather than store request contents in application storage. These are statements about intended application behaviour; check the implementation and live configuration before relying on them.

The hosting platform, network providers, and security infrastructure may process IP addresses, request timing, browser or client details, access and error logs, rate-limit events, or other technical metadata. Those providers may retain records under their own configurations, terms, privacy notices, or legal obligations, independently of the project’s application code.

The Website loads web fonts from Adobe Fonts. Adobe may receive an IP address, browser details and related technical information when serving those fonts. The project does not control the processing done by Adobe or the hosting platform.

If you use a third-party AI client or model, that provider may receive and process the content you send through it under its own terms and privacy practices. If you publish content in public repository issues, pull requests, discussions, or other public channels, that content may be visible, copied, indexed or retained by others. Do not publish secrets, credentials, private keys, access tokens, confidential client information, sensitive personal data, or material you are not authorised to disclose.

The open-source nature of the project does not remove privacy or data-protection obligations that apply to the Maintainer or to third-party providers. The published Privacy Policy should match the actual live data flows and state the relevant purposes, recipients, retention and contact routes.

## 8. Changes to these Terms

The Maintainer may update these Terms as the project, Hosted Services, or applicable law changes. Published versions should show a version number and a last-updated date, and earlier versions may remain available in repository history.

For material changes, the Maintainer will ordinarily give reasonable advance notice, normally 14 days where practicable, through a prominent Website notice or a published change summary. Shorter notice may be used for urgent security, abuse-prevention or legal changes. Where applicable law requires affirmative consent or a particular form of notice, that requirement controls; continued use alone will not substitute for consent where it is legally insufficient.

If you do not agree to a change, stop using the Hosted Services. Changes to the open-source licence for an existing release do not retroactively remove rights already granted under the licence applicable to that release.

## 9. Governing law

These Terms are intended to be governed by the laws of **India**, subject to any mandatory law or protection that applies regardless of this choice. Any dispute may be brought before a court or forum that has jurisdiction under applicable law. Nothing in this section is intended to confer jurisdiction on a court that would not otherwise have it, prevent a party from bringing proceedings before a forum that cannot lawfully be excluded, or restrict any right or remedy that cannot lawfully be restricted.

## 10. Contact and security reports

For questions about the Hosted Services or these Terms, contact **support@kairos-foundation.org**. For privacy questions, contact **privacy@kairos-foundation.org**. For a security vulnerability, do not post exploit details in a public issue or ordinary support email; use GitHub private vulnerability reporting at <https://github.com/drupadsachania/aegis-skills/security/advisories/new>.
