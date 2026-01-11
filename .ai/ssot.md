# SSOT Strategy

> Single Source of Truth patterns | **Last Updated**: 2026-01-11

## Frontend: Design Tokens

```
tokens.css (@theme) → Tailwind Utility Classes → Components
```

| Utility            | Purpose                |
| ------------------ | ---------------------- |
| `rounded-soft`     | 8px default for all UI |
| `font-serif-title` | Playfair Display       |
| `min-h-input`      | 48px (WCAG AAA)        |

## Backend: Constants

| Location                    | Contents                            |
| --------------------------- | ----------------------------------- |
| `@my-girok/nest-common`     | CacheTTL, ID, Pagination (shared)   |
| `service/common/constants/` | SESSION, MFA, RATE_LIMIT (specific) |

## Decision Tree

```
Multi-service? → @my-girok/nest-common
Domain-specific? → service/common/constants/
Configurable? → Environment variables
```

## Types: @my-girok/types

| Category       | SSOT                         | Why              |
| -------------- | ---------------------------- | ---------------- |
| Auth Enums     | `@my-girok/types`            | Cross-service    |
| Identity Enums | Prisma generated             | DB-TS sync       |
| Event Types    | `packages/types/src/events/` | Shared contracts |

**SSOT**: `docs/llm/ssot.md`
