# Human Authentication

## Purpose
Design and deploy phishing-resistant authentication for human users aligned to NIST SP 800-63B.

---

## 1. MFA Standards Hierarchy

### Tier 1 (Highest Assurance) — Phishing-Resistant
```
FIDO2/WebAuthn:
  Hardware tokens:  YubiKey 5 series (USB-A/C, NFC), Feitian, Google Titan
  Platform:         Windows Hello (TPM-backed), Touch ID, Face ID
  
  Why phishing-resistant: credential bound to relying party origin;
  cannot be intercepted and replayed by attacker-controlled site

  Deployment:
  1. Register FIDO2 credential per user per device
  2. Minimum 2 FIDO2 credentials per user (primary + backup)
  3. Recovery flow: in-person identity verification or backup hardware token
  
  NIST SP 800-63B AAL3 requirement for high-value transactions.
```

### Tier 2 (Medium Assurance) — Phishable but Better than SMS
```
TOTP (Time-based One-Time Password):
  Apps: Google Authenticator, Microsoft Authenticator, Authy, 1Password
  RFC 6238 / HOTP (counter-based) RFC 4226
  
  Limitation: TOTP codes can be phished in real-time (adversary-in-the-middle)
  Use when FIDO2 not yet deployed; phase out for high-risk users

Push Notification (e.g. Duo, Okta Verify):
  Better UX than TOTP; same phishability risk
  Enable number matching to prevent MFA fatigue attacks
  Enable additional context (location, device) in push notification
```

### Tier 3 (Deprecated for High-Risk)
```
SMS / Voice OTP:
  Vulnerable to: SIM swapping, SS7 attacks, social engineering of carrier
  NIST SP 800-63B: "RESTRICTED" — only with risk acceptance
  Acceptable use: low-risk consumer applications only
  NEVER use for: admin accounts, privileged access, financial transactions
```

---

## 2. SSO Architecture

### SAML 2.0
```
Flow: SP-initiated or IdP-initiated
Key components:
  IdP: Azure AD, Okta, Ping Identity, Google Workspace
  SP: SaaS applications (Salesforce, Workday, etc.)

SAML assertion: signed XML containing NameID, attributes, and conditions
Clock skew tolerance: < 5 minutes (NTP synchronisation required)
Binding: HTTP POST (preferred); HTTP Redirect for AuthnRequest only
```

### OIDC / OAuth 2.0
```
OIDC: authentication layer on top of OAuth 2.0
Authorization Code Flow (most secure for web apps):
  1. User initiates login → app redirects to IdP with client_id + scope
  2. User authenticates at IdP
  3. IdP returns authorization code to redirect_uri
  4. App exchanges code for id_token + access_token (server-side)
  5. App validates id_token signature (JWKS endpoint)

PKCE (Proof Key for Code Exchange): Required for mobile/SPA/public clients
  Prevents authorization code interception attacks

Token lifetimes (NIST 800-63B guidance):
  Access token:  15-60 minutes (short-lived)
  Refresh token: 24 hours max (revokable)
  ID token:      Same as access token
```

---

## 3. Passwordless Design

### FIDO2 Passkeys
```
Passkeys = discoverable FIDO2 credentials (synced or device-bound)

Synced passkeys (platform): stored in iCloud Keychain / Google Password Manager
  - Good UX: available on all user devices
  - Risk: credential leaves device (phishing-resistant but not hardware-bound)

Device-bound passkeys: stored in device TPM (Windows Hello) or Secure Enclave (iOS/Mac)
  - Better security: credential cannot be extracted
  - Limited to single device; need backup credential

Deployment steps:
  1. Enable FIDO2 in IdP (Azure AD, Okta)
  2. Communicate to users: QR code enrolment or guided session
  3. Enforce passkey for admin and privileged users first
  4. Phase in for all users over 3-6 months
  5. Disable SMS as fallback for enrolled users
```

---

## 4. Password Policy (NIST SP 800-63B Aligned)

```
NIST SP 800-63B recommendations:
  Minimum length:      12 characters (8 for low-risk systems)
  Maximum length:      At least 64 characters (allow passphrases)
  Character sets:      Allow all printable ASCII + Unicode; DO NOT require complexity
  Complexity rules:    REMOVE mandatory complexity rules (they don't improve security)
  Expiry:              NO mandatory rotation unless evidence of compromise
  History:             Prohibit last 5 passwords
  Breach check:        Check against HaveIBeenPwned (HIBP) API on creation

  HIBP API check:
  k1 = SHA1(password)[:5]  # k-anonymity model — send only first 5 chars
  curl https://api.pwnedpasswords.com/range/<k1>
  # Response: list of suffixes; check if full SHA1 appears → reject if so
```

---

## 5. Session Management

```
Session timeout:
  Standard users:       60-minute inactivity timeout
  Admin/privileged:     15-30 minute inactivity timeout
  High-risk actions:    Step-up authentication required (re-authenticate)

Token security:
  HttpOnly flag:        Prevents XSS access to session cookie
  Secure flag:          HTTPS only
  SameSite=Strict:      CSRF protection
  
Refresh token rotation:
  Issue new refresh token on each use
  Revoke old refresh token immediately
  Refresh token compromise detection: if old RT used after rotation = revoke all

Session revocation:
  Immediate revocation on: logout, password change, MFA change,
  suspicious activity detection, admin revocation
  
  OIDC back-channel logout: IdP notifies all SPs of logout event
  SAML SLO (Single Logout): propagate logout to all SAML SPs
```
