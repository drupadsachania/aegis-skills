# Scope Definition

## Purpose
Determine which regulations apply, define in-scope assets and boundaries, classify data, and document the compliance scope before any assessment work begins.

---

## 1. Asset Inventory Methodology

### Asset Categories
| Category | Examples |
|----------|---------|
| Hardware | Servers, workstations, network devices, mobile devices, IoT/OT devices |
| Software | Operating systems, applications, databases, SaaS platforms |
| Data | Customer PII, financial records, health records, intellectual property |
| People | Employees, contractors, third parties with system access |
| Third Parties | Cloud providers, payment processors, managed service providers |

### Asset Inventory Fields
```
Asset ID, Asset Name, Asset Type, Owner (Business / IT),
Data Classification, Location (Physical/Cloud Region), 
Environment (Prod/Dev/Test), Regulatory Scope, Last Updated
```

---

## 2. Data Classification Scheme

| Level | Description | Examples |
|-------|-------------|---------|
| Public | Intentionally public | Marketing materials, job postings |
| Internal | Internal use, not for external sharing | Internal policies, org charts |
| Confidential | Business-sensitive, limited distribution | Financial data, contracts |
| Restricted | Highest sensitivity, regulatory requirement | PHI, PAN, credentials, source code |

Map data classification to regulatory treatment:
- Restricted PAN data → PCI-DSS CDE scoping
- Restricted PHI/ePHI → HIPAA scoping
- Confidential/Restricted EU personal data → GDPR scoping

---

## 3. Regulatory Applicability Assessment Matrix

| Regulation | Trigger Criteria |
|------------|-----------------|
| PCI-DSS | Store, process, or transmit cardholder data (PAN, SAD) |
| HIPAA | US-based covered entity or business associate with PHI/ePHI |
| GDPR | Processing personal data of EU/EEA data subjects |
| SOC 2 | SaaS/service provider with customer data; client audit requirement |
| ISO 27001 | Voluntary certification; global enterprise; customer requirement |
| NIST CSF | US federal contractors; voluntary framework for all sectors |
| CCPA | California consumers' data; annual revenue > $25M or 50k+ consumers |
| NERC CIP | Electric utility; Bulk Electric System (BES) Cyber Systems |

---

## 4. PCI-DSS CDE Scoping

### Cardholder Data Environment (CDE) Definition
```
CDE = all systems that store, process, or transmit:
  - Primary Account Number (PAN)
  - Cardholder Name
  - Service Code  
  - Expiration Date
  - Sensitive Authentication Data (SAD): CVV2, PIN, magnetic stripe

Connected-to systems = systems that connect TO CDE networks
Security systems = systems providing security services to CDE

Scope reduction strategies:
  - Tokenisation: replace PAN with token (removes from scope)
  - P2PE (Point-to-Point Encryption): scope reduction for card-present
  - Redirect method for e-commerce: third-party hosted payment page
```

---

## 5. HIPAA PHI/ePHI Identification

### PHI Identifiers (18 HIPAA identifiers)
```
Names, Geographic data (below state level), Dates (except year),
Phone numbers, Fax numbers, Email addresses, SSN, MRN,
Health plan beneficiary numbers, Account numbers, Certificate numbers,
VINs, Device identifiers, URLs, IP addresses, Biometric identifiers,
Full-face photographs, Any other unique identifier
```

ePHI = PHI in electronic form. All ePHI requires HIPAA Security Rule compliance.

---

## 6. GDPR Personal Data Mapping

### Personal Data Categories
- Basic identity: name, address, date of birth
- Contact data: email, phone
- Online identifiers: IP addresses, cookies, device IDs
- Special categories (Article 9): health, biometric, genetic, racial/ethnic, political, religious, trade union, sexual orientation

### Data Flow Mapping Requirements
```
For each personal data type:
1. What data? (categories and sensitivity)
2. Why? (lawful basis: consent, contract, legal obligation, legitimate interest)
3. Where from? (source: customer, employee, third party)
4. Where stored? (system, location, country)
5. Who has access? (internal roles, third parties)
6. How long? (retention period, deletion mechanism)
7. Where transferred? (third countries, safeguards)
```

---

## 7. Scope Documentation Template

```
COMPLIANCE SCOPE DOCUMENT
===========================
Organisation: <name>
Date: <YYYY-MM-DD>
Version: <n>
Approved by: <CISO/DPO/Compliance Lead>

Applicable Regulations:
  [ ] PCI-DSS v4.0 — SAQ type: <A/B/B-IP/C/C-VT/D/P2PE-HW>
  [ ] HIPAA Security Rule — Covered Entity / Business Associate
  [ ] GDPR — Controller / Processor / Both
  [ ] SOC 2 Type <I/II> — TSC: <Security/Availability/Confidentiality/PI/Privacy>
  [ ] ISO 27001:2022
  [ ] NIST CSF 2.0
  [ ] Other: <specify>

In-Scope Assets: <list or reference asset register>
Out-of-Scope (with justification): <list>
In-Scope Data Types: <list>
Third Parties in Scope: <list>
Geographic Scope: <regions/countries>
Scope Review Date: <date>
```
