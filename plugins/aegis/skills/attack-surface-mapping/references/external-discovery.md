# External Discovery — Reference

Use during Phase 1 to enumerate the organisation's internet-facing attack surface using OSINT and active reconnaissance.

## OSINT Sources Table

| Source | What It Finds | URL / Command |
|--------|--------------|--------------|
| Shodan | Internet-facing services, banners, CVEs | `https://shodan.io/search?query=org:"Company Name"` |
| Censys | TLS certificates, open ports, cloud assets | `https://search.censys.io/` |
| crt.sh | SSL/TLS certificate transparency logs → subdomains | `https://crt.sh/?q=%.example.com` |
| SecurityTrails | DNS history, subdomains | `https://securitytrails.com/` |
| WHOIS / RDAP | IP range ownership, ASN | `whois example.com` |
| GitHub / GitLab | Exposed credentials, internal hostnames in code | `site:github.com "example.com" password` |
| Google Dork | Indexed sensitive files, login pages | `site:example.com filetype:pdf "confidential"` |
| LinkedIn | Employee names, technologies used | Enumerate for social engineering risk |

## Active Discovery Commands

```bash
# Subdomain enumeration
subfinder -d example.com -o subdomains.txt
amass enum -passive -d example.com -o amass-out.txt

# DNS resolution of discovered subdomains
cat subdomains.txt | dnsx -a -resp -o dns-resolved.txt

# HTTP/S service discovery
cat dns-resolved.txt | httpx -status-code -title -tech-detect -o http-services.txt

# Port scan on discovered IPs
nmap -sV -p 80,443,8080,8443,22,21,3389,3306,5432 -iL ip-list.txt -oX portscan.xml

# Grab TLS certificate details
echo | openssl s_client -connect target.example.com:443 2>/dev/null | openssl x509 -noout -text
```

## Asset Inventory Output Table

| Asset | IP Address | ASN | Open Ports | Technology | Risk Level | Notes |
|-------|-----------|-----|------------|-----------|-----------|-------|
| vpn.example.com | 203.0.113.10 | AS12345 | 443, 4443 | Palo Alto GlobalProtect | High | Check for known CVEs |
| legacy-app.example.com | 203.0.113.15 | AS12345 | 80, 8080 | Apache 2.2 | Critical | EOL software |
| mail.example.com | 203.0.113.20 | AS12345 | 25, 587, 993 | Exchange 2019 | Medium | Confirm patched |

## Reconnaissance ATT&CK Mapping

| ATT&CK Technique | What Is Being Replicated | Priority Finding |
|-----------------|------------------------|-----------------|
| T1596.005 — Scan Databases | Shodan / Censys enumeration of org IPs | Open management ports (22/RDP) |
| T1596.001 — DNS / Passive DNS | crt.sh subdomain enumeration | Wildcard certs, forgotten subdomains |
| T1594 — Search Victim Websites | Google dorking, LinkedIn | Exposed sensitive files, technology stack |
| T1590 — Gather Victim Network Info | WHOIS, ASN lookup, BGP data | IP ranges, cloud providers used |
