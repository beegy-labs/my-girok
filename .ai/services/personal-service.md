# Personal Service

> Resume management (PostgreSQL + MinIO) | Port: 4002 | REST only

| Owns             | NOT This Service    |
| ---------------- | ------------------- |
| Resume CRUD      | Accounts (identity) |
| User preferences | Permissions (auth)  |
| File attachments | Consents (legal)    |
| Public sharing   | Analytics, Audit    |

## Endpoints (Summary)

```
/resume/*      - CRUD, copy, sections, attachments
/share/*       - Public sharing tokens
/v1/user-preferences - User settings
```

**SSOT**: `docs/llm/services/personal-service.md`
