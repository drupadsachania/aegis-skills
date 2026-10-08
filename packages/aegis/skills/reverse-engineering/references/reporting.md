# Reporting

## Purpose
Produce a structured analyst report with IOC package, YARA rules, and defensive recommendations.

---

## 1. Technical Report Structure

```
REVERSE ENGINEERING REPORT
===========================
Sample: <SHA256>
Date: <YYYY-MM-DD>
Analyst: <name>
Classification: <TLP:AMBER | TLP:RED | etc.>
Confidence: <High | Medium | Low>

1. EXECUTIVE SUMMARY (3-5 sentences, non-technical)
2. SAMPLE METADATA
3. KEY FINDINGS
4. TECHNICAL ANALYSIS DETAIL
5. MITRE ATT&CK MAPPING
6. IOC PACKAGE
7. DEFENSIVE RECOMMENDATIONS
8. YARA RULES
9. APPENDIX
```

---

## 2. Sample Metadata Block

```yaml
file_name: <original filename>
file_size: <bytes>
file_type: <PE32+ executable / ELF 64-bit / etc.>
md5: <hash>
sha1: <hash>
sha256: <hash>
imphash: <hash>
ssdeep: <fuzzy hash>
compile_timestamp: <UTC datetime or "spoofed">
packer: <UPX 3.96 / None / Unknown custom>
architecture: x86 / x64 / ARM
subsystem: GUI / Console / Native
vt_score: <n/70>
first_seen: <date from VT>
```

---

## 3. IOC Extraction Template

### File Indicators
Hashes:
  MD5:    <hash>
  SHA1:   <hash>
  SHA256: <hash>

Dropped Files:
  Path: <full path>
  Hash: <sha256>
  Purpose: <loader / config / payload>

### Network Indicators
C2 Domains:
  <domain> (<IP>, <geolocation>, <first-seen>)

C2 IPs:
  <IP>:<port> (<geolocation>, <ASN>)

URLs:
  <full URL>

SSL Certificate:
  Fingerprint: <SHA1>
  Subject: <CN=...>

User-Agent:
  <string>

JA3 Fingerprint:
  <ja3_hash>

### Host Indicators
Registry Keys:
  Created: <HKLM\...>
  Value: <name> = <data>

Mutex: <mutex name>
Service Name: <service name>; Path: <binary path>
Scheduled Task Name: <task name>; Command: <cmd>
Named Pipe: \\.\pipe\<name>

---

## 4. MITRE ATT&CK TTP Summary Table

| Tactic          | Technique ID | Technique Name            | Evidence | Confidence |
|-----------------|--------------|---------------------------|----------|------------|
| Execution       | T1059.003    | Windows Command Shell     | <ref>    | High       |
| Persistence     | T1547.001    | Registry Run Keys         | <ref>    | High       |
| Defense Evasion | T1027        | Obfuscated Files/Info     | <ref>    | High       |
| Defense Evasion | T1055.012    | Process Hollowing         | <ref>    | Medium     |
| C2              | T1071.001    | Web Protocols             | <ref>    | High       |
| Exfiltration    | T1041        | Exfiltration Over C2      | <ref>    | Medium     |

---

## 5. YARA Rule Authoring Template

```yara
rule MalwareFamily_Variant_Year {
    meta:
        description = "Brief description"
        author = "Analyst name"
        date = "YYYY-MM-DD"
        hash = "SHA256 of sample"
        tlp = "AMBER"
        mitre_attack = "T1055.012, T1071.001"

    strings:
        $str1 = "unique string" ascii wide
        $str2 = "unique string" ascii wide nocase
        $bytes1 = { 4D 5A 90 00 03 00 00 00 }
        $api1 = "VirtualAllocEx" ascii
        $api2 = "WriteProcessMemory" ascii
        $api3 = "CreateRemoteThread" ascii
        $mutex = "mutex_name" ascii wide

    condition:
        uint16(0) == 0x5A4D and
        filesize < 5MB and
        (
            (2 of ($str*)) or
            ($bytes1 and 1 of ($api*)) or
            ($mutex)
        )
}
```

---

## 6. Defensive Recommendations Template

DETECTION RECOMMENDATIONS:
1. Network: Block C2 IPs/domains at perimeter; deploy Suricata/Snort rules; TLS inspection for JA3 fingerprint
2. Endpoint: Sigma rule for process injection (Sysmon EID 8); alert on new service matching pattern; monitor registry path
3. Email/Web Gateway: Block file hashes; block download of identified file types from external sources
4. Hunting Query (KQL Sentinel):
   DeviceFileEvents | where FileName has "<indicator>" | project Timestamp, DeviceName, InitiatingProcessFileName, FolderPath
5. Patching: Apply patches for identified CVEs; disable features not required

---

## 7. Confidence Level Definitions

| Level  | Definition |
|--------|-----------|
| High   | Multiple independent sources of evidence; technique unambiguously observed |
| Medium | Technique inferred from partial evidence; manual unpacking may have altered analysis |
| Low    | Circumstantial indicators only; requires further corroboration |

---

## 8. Analyst Notes Checklist

- [ ] All IOCs independently verified (no false positives from common system files)
- [ ] Network IOCs checked against benign infrastructure (CDNs, update servers)
- [ ] YARA rule tested against clean corpus (false positive rate < 0.01%)
- [ ] ATT&CK mappings reviewed against ATT&CK Navigator for completeness
- [ ] Report peer-reviewed by second analyst before distribution
- [ ] TLP classification applied and enforced in distribution
