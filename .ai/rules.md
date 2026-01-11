# Core Development Rules

> Essential rules for AI assistants | **Last Updated**: 2026-01-11

## Language Policy

**ALL code, documentation, and commits MUST be in English.**

## Documentation Policy (4-Tier)

| Tier | Path        | Editable | Purpose                |
| ---- | ----------- | -------- | ---------------------- |
| 1    | `.ai/`      | Yes      | Pointer (30-50 lines)  |
| 2    | `docs/llm/` | Yes      | SSOT (token-optimized) |
| 3    | `docs/en/`  | No       | Human docs (generated) |
| 4    | `docs/kr/`  | No       | Korean (translated)    |

## NEVER

| Rule                  | Alternative             |
| --------------------- | ----------------------- |
| Duplicate types       | Use `packages/types`    |
| `prisma migrate`      | Use goose (SSOT)        |
| TEXT for IDs          | Native UUID with UUIDv7 |
| Prisma in Controllers | Use Services            |
| Hardcode secrets      | Use ConfigService       |
| External CDN links    | Self-host locally       |

## ALWAYS

| Rule               | Details                    |
| ------------------ | -------------------------- |
| Types first        | Define in `packages/types` |
| `@Transactional()` | For multi-step DB ops      |
| 80% coverage       | CI blocks below threshold  |
| Include tests      | With all code changes      |
| Self-host fonts    | In design-tokens package   |

## Key Patterns

```typescript
// Transaction
@Transactional()
async create(dto) { await this.repo.create(dto); }

// React memo for list items
export const ListItem = memo(function ListItem({ item }) {});
```

## Stack

| Category | Technology                                         |
| -------- | -------------------------------------------------- |
| Web      | React 19.2, Vite 7.2, TypeScript 5.9, Tailwind 4.1 |
| Backend  | Node.js 24, NestJS 11                              |
| Database | PostgreSQL 16, Prisma 6, Valkey                    |

**SSOT**: `docs/llm/rules.md`
