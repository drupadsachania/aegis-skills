---
name: identity-access-management
description: >-
  Comprehensive IAM programme covering identity governance
  (Joiners/Movers/Leavers), human authentication (FIDO2, SSO, passwordless),
  privileged access management (PAM), non-human identities (service accounts,
  API keys, secrets), AI/agent identity, and access review and audit. Triggers
  for: MFA deployment, PAM design, secrets management, identity governance,
  agent identity, or access review programme.
license: Apache-2.0 OR MIT
metadata:
  version: "1.1.0"
  osk: "1.1"
  family: "domain"
---

# Identity and Access Management Skill

## Scope and authorization

- Purpose: Design and review identity governance, authentication, privileged access and non-human identity controls.
- Use only on systems you own or are explicitly authorized to assess.
- Out of scope: password cracking, credential harvesting or account takeover, and accessing accounts you are not authorised to administer.
- No network or API calls by the assistant: it never makes network requests, calls APIs or contacts outside services. Commands here are for a human operator to review and run. Redact secrets, credentials, personal data and samples before sharing anything.


Comprehensive IAM framework covering human identities, privileged access,
non-human identities, and the emerging challenge of AI/agent identity.
Prioritise phishing-resistant authentication and least-privilege access.

## Phases

Load each phase only when the workflow reaches it:

- [Identity governance](references/identity-governance.md)
- [Human authentication](references/human-authentication.md)
- [Privileged access management](references/privileged-access-management.md)
- [Non human identities](references/non-human-identities.md)
- [Agent and ai identities](references/agent-and-ai-identities.md)
- [Access review and audit](references/access-review-and-audit.md)
- [Live threat intel](references/live-threat-intel.md) — auto-updated weekly
