# Authorization

> ReBAC + OpenFGA (Google Zanzibar) | 2026 Best Practice

## Architecture

```
Apps → Authorization Service → OpenFGA → PostgreSQL
```

## Core Concept

```
(user:alice, member, team:cs-kr) → (team:cs-kr, viewer, recordings:svc-a)
```

## Delegation Levels

| Level | Role          | Can Manage    |
| ----- | ------------- | ------------- |
| 0     | Super Admin   | All           |
| 1     | Service Admin | Service scope |
| 2     | Team Lead     | Team members  |

## Key Types

| Type              | Purpose                     |
| ----------------- | --------------------------- |
| platform          | Global permissions          |
| service           | Service-scoped              |
| team              | Permission groups (A,B,C,D) |
| session_recording | Feature permission          |

## Anti-Patterns

```yaml
NEVER:
  - Store permissions in JWT
  - Self-assign higher level
  - Cache > 5 minutes
```

**SSOT**: `docs/llm/policies/authorization.md`
