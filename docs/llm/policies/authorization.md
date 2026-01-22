# Authorization Policy

> Zanzibar-style ReBAC (Self-implemented) | 2026 Best Practice

## Service

**authorization-service**: `docs/llm/services/authorization-service.md`

## Architecture

```
Applications (web-admin, auth-bff, services)
              │
              ▼
    Authorization Service (NestJS)
              │
              ▼
         OpenFGA Engine
              │
              ▼
      PostgreSQL (Tuples)
```

## Why OpenFGA

| Feature     | Custom RBAC | OpenFGA         |
| ----------- | ----------- | --------------- |
| Inheritance | SQL JOINs   | Graph traversal |
| Performance | O(n)        | O(1) + cache    |
| Scale       | Limited     | Google-scale    |

## Core Concepts

### Relationship Tuple

```
(user:alice, member, team:cs-korea)
(team:cs-korea, viewer, session_recording:service-a)
```

### Permission Inheritance

```
user:alice ──member──> team:cs-kr ──viewer──> session_recording:service-a
                                        │
                                        ▼
                            alice can view recordings
```

## Permission Format

```
{resource}:{action}[:{scope}]

Examples:
  users:read                    # Default scope
  users:read:service-a          # Service-scoped
  session-recordings:view       # Feature permission
```

## Standard Actions & Resources

| Action | Description         |
| ------ | ------------------- |
| create | Create resources    |
| read   | View/list resources |
| update | Modify resources    |
| delete | Remove resources    |
| manage | Full CRUD + special |

| Resource           | Description      |
| ------------------ | ---------------- |
| users              | User management  |
| teams              | Team management  |
| services           | Service config   |
| session-recordings | Session replay   |
| audit-logs         | Audit log access |

## Delegation Model

| Level | Role          | Can Manage                    |
| ----- | ------------- | ----------------------------- |
| 0     | Super Admin   | All services, all permissions |
| 1     | Service Admin | Service-scoped permissions    |
| 2     | Team Lead     | Team members only             |
| 3     | Operator      | No permission management      |

## Anti-Patterns

```yaml
NEVER:
  - Store permissions in JWT (use check API)
  - Cache permissions > 5 minutes
  - Skip audit logging
  - Allow self-assignment of higher level
```

## Related

- Model (DSL): `authorization-model.md`
- API & Guard: `authorization-api.md`
- Service: `authorization-service.md`
