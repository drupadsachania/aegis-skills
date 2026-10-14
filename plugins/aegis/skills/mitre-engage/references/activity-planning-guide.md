# Activity Planning Guide — MITRE Engage

Use this guide to select and sequence Engage activities from an ATT&CK threat model.

## Planning Sequence

1. Take the threat model output from `mitre-attack` (top 7 technique IDs)
2. For each technique, look up the Engage activity mapping
3. Select activities by goal priority:
   - If goal is DETECT early: prioritise Honey Credentials (EAC0003), Decoy Content (EAC0004)
   - If goal is ELICIT intelligence: prioritise Decoy System (EAC0006), Isolated Environment (EAC0019)
   - If goal is DENY capability: prioritise Network Diversity (EAC0013), Attack Vector Migration (EAC0022)

## Activity Selection Criteria

For each candidate activity, assess:
- **Feasibility**: Can you deploy and maintain this asset given your environment?
- **Believability**: Will a sophisticated adversary interact with it?
- **Signal clarity**: Does interaction produce an unambiguous detection signal?
- **Safety**: Can deployment cause harm (especially in OT environments)?

## Output Format

Produce an activity plan table:

| ATT&CK Technique | Engage Activity | Goal | Asset Type | Priority |
|---|---|---|---|---|
| T1078 Valid Accounts | EAC0003 Honey Credentials | Detect | Honeytoken service accounts | High |
| T1213 Data from Repos | EAC0004 Decoy Content | Detect + Elicit | Fake repo with canary credentials | High |

Hand this table to `deception-engineering` for detailed placement and deployment.
