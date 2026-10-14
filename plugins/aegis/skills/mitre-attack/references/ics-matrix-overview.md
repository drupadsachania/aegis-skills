# MITRE ATT&CK ICS Matrix — Reference

Use for OT/ICS environments. Different from Enterprise — focus on process disruption, not data theft.

## ICS-Specific Tactics

| ID | Tactic | OT Context |
|----|--------|-----------|
| TA0108 | Initial Access | Entry via IT/OT boundary, vendor VPN, USB |
| TA0104 | Execution | PLC programming, HMI manipulation |
| TA0110 | Persistence | Rogue firmware, ladder logic modification |
| TA0111 | Privilege Escalation | Engineering workstation access |
| TA0103 | Evasion | Rootkits on historians, log manipulation |
| TA0102 | Discovery | Protocol scanning (Modbus, DNP3, OPC) |
| TA0109 | Lateral Movement | Jump host pivot, historian → PLC |
| TA0100 | Collection | Process data capture, sensor reading |
| TA0101 | Command & Control | Out-of-band comms over OT protocols |
| TA0105 | Inhibit Response | Safety system bypass, alarm suppression |
| TA0106 | Impair Process Control | Setpoint manipulation |
| TA0107 | Impact | Physical damage, process disruption |

## Key ICS Techniques
T0866 Exploitation of Remote Services, T0843 Program Download,
T0836 Modify Parameter, T0855 Unauthorized Command Message,
T0816 Device Restart/Shutdown
