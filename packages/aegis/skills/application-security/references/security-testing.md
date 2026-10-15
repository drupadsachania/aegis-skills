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

Run these against an application you own or are authorized to test, in a staging environment and through
your own CI pipeline. This skill does not run them; the operator does, with authorization.

| Tool | Type | Best For | How it fits |
|------|------|----------|------------|
| OWASP ZAP | Open source | Web apps, authenticated scans | Baseline scan step in CI against staging |
| Burp Suite Pro | Commercial | Manual review and automated testing | Analyst-driven; Burp Enterprise for CI |
| Nuclei | Open source | Template-based checks (CVEs, misconfigs) | Scheduled CI check against your own hosts |
| Nikto | Open source | Web server misconfiguration | Quick configuration review |
| SQLMap | Open source | Confirming SQL injection is fixed on your own app | Validation step after a fix, on staging only |
| ffuf | Open source | Endpoint and content discovery on your own app | Coverage check in staging |

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
    const sessionA = await loginAs('userA');
    const res = await request(app)
      .get('/api/users/userB/profile')
      .set('Authorization', `Bearer ${sessionA}`);
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
