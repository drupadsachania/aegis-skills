# API Security — Reference

Use during Phase 4 to assess and harden API security posture. Covers OWASP API Security Top 10 (2023), authentication hardening, and CORS configuration.

## OWASP API Security Top 10 (2023)

| # | Risk | Description | Key Test | Mitigation |
|---|------|-------------|---------|-----------|
| API1 | Broken Object Level Authorisation (BOLA) | Attacker accesses another user's resources by changing IDs | Change resource ID in request | Validate ownership server-side on every request |
| API2 | Broken Authentication | Weak auth mechanisms allow account takeover | Brute force, credential stuffing test | MFA, rate limiting, strong token expiry |
| API3 | Broken Object Property Level Authorisation | Mass assignment exposes internal fields | Send extra properties in POST body | Allowlist input fields; never bind all request fields |
| API4 | Unrestricted Resource Consumption | No rate limits allow DoS or high costs | High-volume requests | Rate limiting per user/IP; request size limits |
| API5 | Broken Function Level Authorisation | Users can call admin functions | Access admin endpoints as regular user | Explicit authorisation check on every endpoint |
| API6 | Unrestricted Access to Sensitive Business Flows | Automating business flows for abuse | Automate checkout, password reset | CAPTCHA, business logic rate limits |
| API7 | Server Side Request Forgery (SSRF) | API fetches user-supplied URLs | Supply internal IP/cloud metadata URL | Allowlist outbound destinations; block RFC1918 |
| API8 | Security Misconfiguration | Verbose errors, open CORS, debug endpoints | OPTIONS/HEAD requests, error enumeration | Harden headers, remove debug endpoints |
| API9 | Improper Inventory Management | Shadow/deprecated API versions exposed | Enumerate versioned paths (`/v1/`, `/v2/`) | API gateway with version management; deprecate old versions |
| API10 | Unsafe Consumption of APIs | Trusting third-party API responses without validation | Inject malicious data via third-party API | Validate and sanitise all third-party API responses |

## Authentication Hardening Checklist

```
[ ] JWT: verify signature algorithm (reject 'none'), short expiry (≤15 min access token)
[ ] OAuth 2.0: PKCE for public clients, validate state parameter, restrict redirect URIs
[ ] API keys: rotate every 90 days; never log in plaintext; use secrets manager
[ ] mTLS for service-to-service APIs in sensitive environments
[ ] Rate limit authentication endpoints: 5 attempts per minute per IP
[ ] Account lockout after 10 failed attempts (with exponential backoff)
```

## CORS Configuration Rules

```javascript
// Secure CORS — explicit origin allowlist only
app.use(cors({
  origin: ['https://app.example.com', 'https://admin.example.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 3600
}));

// NEVER use: origin: '*' with credentials: true
// NEVER use: origin: '*' for authenticated APIs
```

## Security Headers for APIs

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | `default-src 'none'` | Prevent XSS |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Force HTTPS |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `Cache-Control` | `no-store` | Prevent caching of sensitive responses |
