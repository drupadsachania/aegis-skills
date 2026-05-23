# Security Testing — Reference

Use during Phase 5 to design and execute a security testing strategy across the SDLC.

## Security Testing Pyramid

```
                    ┌──────────┐
                    │  Pentest  │  ← Slowest, most realistic, annual
                   ┌────────────┐
                   │    DAST    │  ← Per release, automated + manual
                  ┌──────────────┐
                  │     SAST     │  ← Every commit / PR
                 ┌────────────────┐
                 │  Dependency SCA│  ← Every commit / PR
                ┌──────────────────┐
                │  Unit / Security │  ← Every commit
                │   Integration    │
                └──────────────────┘
```

## DAST Tools Table

| Tool | Type | Best For | Integration |
|------|------|----------|------------|
| OWASP ZAP | Open source | Web apps, authenticated scans | CI/CD via `zap-cli` or GitHub Action |
| Burp Suite Pro | Commercial | Manual + automated pentest | Manual; Burp Enterprise for CI |
| Nuclei | Open source | Template-based scanning (CVEs, misconfigs) | `nuclei -u https://app.example.com -t cves/` |
| Nikto | Open source | Web server misconfiguration | Quick recon scan |
| SQLMap | Open source | SQL injection testing | `sqlmap -u "https://app.example.com/search?q=test"` |
| ffuf | Open source | API endpoint fuzzing | `ffuf -u https://api.example.com/FUZZ -w wordlist.txt` |

## Sample Jest Security Test Snippets

```javascript
// Test: SQL injection prevention
describe('Search API security', () => {
  test('rejects SQL injection in query parameter', async () => {
    const maliciousInput = "' OR '1'='1";
    const res = await request(app)
      .get(`/api/search?q=${encodeURIComponent(maliciousInput)}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('enforces rate limit on login endpoint', async () => {
    for (let i = 0; i < 10; i++) {
      await request(app).post('/auth/login')
        .send({ username: 'test', password: 'wrong' });
    }
    const res = await request(app).post('/auth/login')
      .send({ username: 'test', password: 'wrong' });
    expect(res.status).toBe(429);
  });

  test('rejects IDOR - accessing another user resource', async () => {
    const userAToken = await loginAs('userA');
    const res = await request(app)
      .get('/api/users/userB/profile')
      .set('Authorization', `Bearer ${userAToken}`);
    expect(res.status).toBe(403);
  });
});
```

## Testing Coverage Matrix

| Test Type | OWASP A01 | OWASP A02 | OWASP A03 | OWASP A04 | OWASP A07 |
|-----------|-----------|-----------|-----------|-----------|-----------|
| Unit / security tests | Partial | Partial | Full | Partial | — |
| SAST | Partial | Partial | Full | — | — |
| DAST | Full | Full | Full | Full | Full |
| Pentest | Full | Full | Full | Full | Full |
