# Auth BFF

> Session-based BFF gateway (IETF pattern) | Port: 4005 | Valkey DB 3

| Owns                 | Delegates To                  |
| -------------------- | ----------------------------- |
| Session management   | identity-service (50051)      |
| Cookie auth          | auth-service (50052)          |
| Token encryption     | audit-service (50054)         |
| OAuth orchestration  |                               |
| GeoIP location       | MaxMind GeoLite2              |
| Authorization models | authorization-service (50055) |

## Endpoints (Summary)

```
/user/*   - User auth (register, login, logout, me)
/admin/*  - Admin auth + MFA + password
          - Authorization (models: CRUD, teams, permissions)
          - Analytics (user activity, sessions)
/oauth/*  - OAuth providers
```

**SSOT**: `docs/llm/services/auth-bff.md`
**GeoIP**: `.ai/services/geoip.md`
