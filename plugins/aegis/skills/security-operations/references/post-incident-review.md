# Post-Incident Review — Reference

**Entry Criteria:** Incident closed (all P1/P2 incidents); recommended for P3; optional for P4. Conduct PIR within 5 business days of incident closure.

**Required Inputs:** Incident ticket, timeline, metrics (MTTD/MTTC/MTTR), attending stakeholders.

## PIR Agenda

| Agenda Item | Duration | Purpose |
|-------------|----------|---------|
| Timeline review | 15 min | Walk through key events chronologically; confirm facts |
| Detection assessment | 10 min | When was the incident first detectable? When was it actually detected? |
| Response assessment | 10 min | Were containment, eradication, and recovery timely and effective? |
| Root cause analysis | 20 min | 5 Whys methodology (see below) |
| Action items | 15 min | Assign owners and due dates for improvements |
| Lessons learned summary | 10 min | What should we start, stop, and continue? |

**Ground rules:** Blameless culture. Focus on processes and systems, not individuals. PIR findings are used for improvement, not discipline (unless gross negligence is involved — handle separately via HR).

## 5 Whys Root Cause Example

**Incident:** Ransomware encrypted 40 servers before detection.

| Why # | Question | Answer |
|-------|----------|--------|
| Why 1 | Why were 40 servers encrypted? | Ransomware spread via SMB before containment |
| Why 2 | Why did it spread so quickly via SMB? | No internal segmentation between server VLAN and backup network |
| Why 3 | Why was there no segmentation? | Segmentation project deprioritised in last budget cycle |
| Why 4 | Why was it deprioritised? | No risk register entry quantifying the risk |
| Why 5 | Why was there no risk register entry? | No formal threat modelling process for infrastructure |

**Root Cause:** Absence of a threat modelling process led to an unquantified segmentation risk being deprioritised.

## Action Item Template

| ID | Finding | Action Required | Owner | Due Date | Priority | Status |
|----|---------|----------------|-------|----------|---------|--------|
| PIR-001 | No SMB segmentation between server and backup VLANs | Implement firewall rule blocking SMB between VLANs | Network Team | 2025-07-15 | P1 | Open |
| PIR-002 | Detection delayed by 6 hours due to SIEM rule gap | Create detection rule for lateral SMB movement | SOC | 2025-07-08 | P1 | Open |

## Metrics to Capture

| Metric | Definition | This Incident | Target |
|--------|-----------|--------------|--------|
| MTTD — Mean Time to Detect | Time from first evidence of attack to detection | [X hours] | < 1 hour for P1 |
| MTTC — Mean Time to Contain | Time from detection to containment | [X hours] | < 4 hours for P1 |
| MTTR — Mean Time to Recover | Time from containment to full service recovery | [X hours] | < 24 hours for P1 |
| Alert-to-Incident conversion rate | % of triaged alerts escalated to incidents | [X%] | Baseline and trend |
| Runbook adherence | Were all steps in the IR runbook followed? | Yes/No/Partial | 100% |
