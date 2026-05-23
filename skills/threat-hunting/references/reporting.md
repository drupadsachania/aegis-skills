# Hunt Reporting Reference

Use during Phase 5 to produce a structured hunt output and feed findings into the detection engineering pipeline.

## Hunt Output Template

The following markdown structure should be used for all completed hunt campaigns:

**Section 1 — Header:** Hunt ID, title, period, lead analyst, hypothesis, ATT&CK techniques investigated, status.

**Section 2 — Executive Summary:** Two to three sentences covering what was hunted, what was found, and key actions taken.

**Section 3 — Telemetry Reviewed:** Table of log sources, time period, and approximate event volume.

**Section 4 — Methodology:** Description of queries, tools, and analysis approach used.

**Section 5 — Findings Table:**

| Finding ID | Description | Verdict | ATT&CK ID | Asset | Action |
|------------|-------------|---------|-----------|-------|--------|
| F-001 | Scheduled task created at 02:00 by PowerShell | True-Positive | T1053.005 | ws045 | IR raised |
| F-002 | DNS query to high-entropy domain | False-Positive | T1071.004 | ws012 | CDN confirmed |

**Section 6 — Detection Engineering Output:** List of Sigma rules, SIEM alerts, IOC blocklist updates, and watchlist entries generated from the hunt.

**Section 7 — Recommendations:** Gaps identified in telemetry coverage, detection capability, or process.

**Section 8 — Metrics:** Hunt duration, events analysed, true-positives, false-positives, detection rules created.

## Detection Engineering Output Types

| Output Type | Description | Destination |
|-------------|-------------|------------|
| Sigma rule | Platform-agnostic detection rule | Detection-as-code repo |
| SIEM alert | Deployed rule in production SIEM | SIEM platform |
| IOC blocklist | C2 IPs, domains, hashes to block | Threat intel platform |
| Watchlist entry | Suspicious but unconfirmed indicators | SIEM watchlist |
| Playbook update | New IR steps for confirmed technique | IR runbook |

## Hunt Programme Metrics Table

| Metric | Definition | Target | Cadence |
|--------|-----------|--------|---------|
| Hunts per quarter | Number of completed hunt campaigns | At least 4 | Quarterly |
| True-positive rate | Percentage of hunts with at least one confirmed finding | At least 30% | Per hunt |
| Detections created | New SIEM rules generated from hunt findings | At least 1 per hunt | Per hunt |
| MTTD improvement | Reduction in mean time to detect after new rules deployed | Measure quarterly | Quarterly |
| Telemetry coverage | Percentage of ATT&CK techniques with at least one detection | Target 70% or higher | Quarterly |

## Sqrll Hunting Maturity Model Reference

| Level | Name | Description |
|-------|------|-------------|
| 0 | Initial | Relies entirely on automated alerts; no proactive hunting |
| 1 | Minimal | Hunt using threat intel IOCs only |
| 2 | Procedural | Follows documented hunt procedures using data analysis |
| 3 | Innovative | Creates new hunt procedures; uncovers novel attacker techniques |
| 4 | Leading | Automates hunt procedures; integrates with detection pipeline |
