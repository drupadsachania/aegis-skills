# Email & SaaS / CASB — Reference

Use during Phase 4 to control data leaving through email and SaaS applications — the most
common exfil path and the one users touch daily. Covers email DLP, collaboration platforms,
and CASB for sanctioned and shadow SaaS.

## 1. Email DLP

| Control | Purpose | Action |
|---------|---------|--------|
| Content inspection (body + attachments) | Detect Restricted data in outbound mail | Block / encrypt / quarantine |
| Recipient controls | Prevent wrong-recipient leaks | Warn on external; block Restricted to personal domains |
| Attachment inspection | Catch sensitive files | Scan archives; block encrypted zips that evade inspection |
| Automatic encryption | Protect legitimate external sends | Force encryption (OME/S-MIME) when Restricted + external |
| Misdirected-email prevention | #1 accidental breach cause | ML anomaly on recipient/content mismatch (e.g., Tessian-style) |

```
Email DLP policy ladder:
  Internal → any                : monitor
  Confidential → external       : warn + justification, auto-encrypt
  Restricted → external         : block unless approved + encrypted
  Restricted → personal webmail : block always
  Bulk PII/PAN attachment       : block + escalate to SecOps

Watch the evasion paths:
  - Password-protected archives (inspection-blind) → block or require inspectable format
  - Data pasted into body to dodge attachment scan → inspect body content
  - Auto-forward rules to external addresses → alert on rule creation (T1114.003)
```

## 2. Collaboration & File-Sharing (M365 / Google Workspace / Slack / Box)

```
Sharing controls:
  [ ] Default sharing = internal only; external share requires justification/approval
  [ ] Block "anyone with the link" for Confidential/Restricted labels
  [ ] Expiry on external share links; periodic access recertification
  [ ] Label-aware policy: Restricted docs cannot be shared externally at all
  [ ] Disable/limit external guest access; review guest accounts quarterly

Chat/collab exfil:
  - DLP on Slack/Teams messages + file uploads (secrets, PII in channels/DMs)
  - Block connectors/webhooks posting internal data to external services
```

## 3. CASB — Sanctioned & Shadow SaaS

| CASB Mode | What It Does | Use For |
|-----------|-------------|---------|
| API-based (out-of-band) | Scans data at rest in sanctioned SaaS via API | M365, Google, Salesforce, Box, ServiceNow |
| Inline (proxy) | Real-time control on traffic to SaaS | Block uploads to unsanctioned tenants |
| Log-based discovery | Finds shadow SaaS from proxy/firewall logs | Shadow IT inventory + risk scoring |

```
CASB programme:
  1. Discover — inventory all SaaS in use (shadow IT) from egress logs
  2. Risk-rank — score each app (compliance, data residency, breach history)
  3. Sanction / block — allowlist approved tenants; block or coach risky ones
  4. Tenant restrictions — allow corporate M365/Google tenant, block personal
     (HTTP header injection: Restrict-Access-To-Tenants / X-GoogApps-Allowed-Domains)
  5. Enforce DLP — same classification labels applied inside sanctioned SaaS
  6. Monitor — anomalous downloads, mass sharing, impossible-travel access

CASB platforms: Netskope, Microsoft Defender for Cloud Apps, Zscaler, Palo Alto.
```

## 4. Generative-AI / LLM Egress (Emerging Channel)

```
Employees pasting Restricted data into public AI tools is a fast-growing leak path:
  [ ] Discover AI-tool usage via CASB/SWG (ChatGPT, Claude, Gemini, Copilot, etc.)
  [ ] Policy: block Restricted/source-code paste into consumer AI; route to enterprise tenant
  [ ] Inspect prompts at the SWG where policy allows; coach users on approved tools
  [ ] Provide a sanctioned enterprise AI with no-training + data-residency guarantees
```

## 5. Metrics

| Metric | Target |
|--------|--------|
| Outbound Restricted emails blocked/encrypted | 100% of policy hits |
| External "anyone" links on Restricted content | 0 |
| Shadow SaaS apps with Restricted data | Trend → 0 (sanction or block) |
| Mean time to revoke risky external share | < 24h |

## ATT&CK Mapping
T1567 Exfiltration Over Web Service · T1114 Email Collection · T1114.003 Email Forwarding Rule · T1530 Data from Cloud Storage · T1213 Data from Information Repositories · T1537 Transfer Data to Cloud Account
