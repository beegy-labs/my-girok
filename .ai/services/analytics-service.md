# Analytics Service

> Business analytics (ClickHouse, 90d-2yr retention) | Port: 3011 | REST only

| Owns              | NOT This Service   |
| ----------------- | ------------------ |
| Session analytics | Compliance (audit) |
| Event tracking    | User accounts      |
| Funnel analysis   | Authorization      |
| Campaign attr.    | User data storage  |

## Endpoints (Summary)

```
/v1/ingest/*   - Session, event, pageview, error
/v1/sessions/* - Stats, summary, distribution
/v1/events/*   - Event queries
/v1/funnels/*  - Funnel analysis
```

**SSOT**: `docs/llm/services/analytics-service.md`
