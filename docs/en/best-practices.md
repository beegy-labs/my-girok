# 2026 Best Practices

> Monthly review checklist for database, React, backend, testing, and Git standards

## Overview

This document outlines the best practices that should be reviewed monthly to ensure codebase quality and consistency across the my-girok project. All developers should familiarize themselves with these guidelines.

## Database Best Practices

| Do                   | Don't            |
| -------------------- | ---------------- |
| goose for migrations | `prisma migrate` |
| TEXT for IDs         | UUID type        |
| TIMESTAMPTZ(6)       | TIMESTAMP        |

**Explanation**:

- Use goose as the single source of truth for database migrations across all database types (PostgreSQL, ClickHouse)
- Store UUIDs as TEXT type in PostgreSQL for better compatibility and simpler debugging
- Always use TIMESTAMPTZ(6) with 6 decimal places for microsecond precision and timezone awareness

## React 19+ Best Practices

| Do                   | Don't               |
| -------------------- | ------------------- |
| React Compiler       | Manual memo/useMemo |
| `use()` for async    | useEffect fetch     |
| Design tokens (SSOT) | Inline styles       |

**Explanation**:

- React 19's built-in compiler handles memoization automatically, reducing the need for manual optimization
- The new `use()` hook provides a cleaner pattern for handling async data than useEffect
- Design tokens ensure visual consistency and make theme changes easier to implement

## Backend Best Practices

| Do                 | Don't               |
| ------------------ | ------------------- |
| `@Transactional()` | Manual transactions |
| gRPC internal      | REST everywhere     |
| class-validator    | Manual validation   |

**Explanation**:

- The `@Transactional()` decorator from nest-common handles transaction management cleanly
- Internal service-to-service communication should use gRPC for better performance
- class-validator DTOs provide type-safe validation with decorators

## Testing Best Practices

| Do            | Don't          |
| ------------- | -------------- |
| 80% coverage  | Skip tests     |
| Test fixtures | Hardcoded data |

**Explanation**:

- Maintain minimum 80% code coverage across all services
- Use test fixtures and factories instead of hardcoded test data for maintainability

## Git Best Practices

| Do                      | Don't             |
| ----------------------- | ----------------- |
| Squash: feat -> develop | Merge on features |
| Merge: develop -> main  | Squash on release |

**Explanation**:

- Feature branches should be squash-merged into develop to maintain a clean history
- Release and production merges should use regular merge commits to preserve the complete history

## Anti-Patterns to Avoid

```
- Over-engineering
- Abstractions for one-time ops
- Features beyond requirements
```

These anti-patterns lead to unnecessary complexity and maintenance burden. Keep implementations simple and focused on actual requirements.

---

**LLM Reference**: `docs/llm/best-practices.md`
