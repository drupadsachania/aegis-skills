# Data Flow Diagramming — Reference

Use during Phase 2 to construct a Data Flow Diagram (DFD) that serves as the basis for STRIDE threat enumeration.

## DFD Notation Table

| Symbol | Shape | Represents | Threat Model Significance |
|--------|-------|-----------|--------------------------|
| External Entity | Rectangle | Users, external systems, third-party services | Source/sink of data; not trusted by default |
| Process | Circle (or rounded rectangle) | Application logic, microservice, function | Where data is transformed; target for tampering/injection |
| Data Store | Parallel horizontal lines | Database, file system, cache, queue | Where data persists; target for info disclosure/tampering |
| Data Flow | Arrow | Data moving between components | Target for interception (info disclosure), tampering (MITM) |
| Trust Boundary | Dashed rectangle | Line where trust level changes | Critical security control point; every crossing needs validation |

## Level 0 — Context Diagram

Level 0 shows the entire system as a single process with external actors:

```
[Customer Browser] ──HTTPS──► (Payment App) ──► [Payment Processor API]
                                    │
                                    ▼
                              ═══ Customer DB ═══
```

## Level 1 — Decomposition

Level 1 decomposes the system process into its main components:

```
[Customer] ──HTTPS──► (API Gateway) ──JWT──► (Auth Service) ──► ═ Session Store ═
                            │                      │
                            ▼                      ▼
                      (Order Service) ──────► ═ Order DB ═
                            │
                    ┌ Trust Boundary ┐
                            │
                            ▼
                      (Payment Service) ──TLS──► [Payment Processor]
```

## Trust Boundary Examples

| Boundary | What Crosses It | Required Controls |
|----------|----------------|------------------|
| Internet → API Gateway | User requests (HTTPS) | WAF, TLS 1.2+, authentication |
| API Gateway → Backend Services | Internal API calls (JWT) | mTLS or token validation |
| Application → Database | Queries (TLS) | DB auth, parameterised queries, least-privilege role |
| Internal Network → External API | Outbound HTTP | Egress filtering, proxy, certificate pinning |

## Security Review Questions per Data Flow

For each arrow in the DFD, ask:
1. Is this data flow encrypted in transit?
2. Is the source authenticated before the flow is accepted?
3. Is the data validated and sanitised on receipt?
4. Is the flow logged for audit purposes?
5. Can the volume/rate of this flow be abused (DoS)?
6. What is the classification of data in this flow?
