# Auth BFF

> Session-based BFF gateway (IETF pattern) | Port: 4005 | Valkey DB 5

| Owns                 | Delegates To                  |
| -------------------- | ----------------------------- |
| Session management   | identity-service (50051)      |
| Cookie auth          | auth-service (50052)          |
| Token encryption     | audit-service (50054)         |
| OAuth orchestration  |                               |
| GeoIP location       | MaxMind GeoLite2              |
| Authorization models | authorization-service (50055) |
| Session analytics    | audit-service (50054)         |
| Live session updates | WebSocket /ws/sessions        |

## Endpoints (Summary)

```
/user/*   - User auth (register, login, logout, me)
/admin/*  - Admin auth + MFA + password
          - Authorization (models: CRUD, teams, permissions)
          - Session recordings (list, export, share, analytics)
/oauth/*  - OAuth providers

WebSocket:
/ws/sessions - Live session monitoring (5s polling, broadcast updates)
```

**SSOT**: `docs/llm/services/auth-bff.md`
**GeoIP**: `.ai/services/geoip.md`
