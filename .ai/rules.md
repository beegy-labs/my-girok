# Core Development Rules

> Essential rules for AI assistants | **Last Updated**: 2026-01-11

## Language Policy

**ALL code, documentation, and commits MUST be in English.**

## Documentation Policy (4-Tier)

| Tier | Path        | LLM Editable | Purpose                |
| ---- | ----------- | ------------ | ---------------------- |
| 1    | `.ai/`      | **YES**      | Pointer (50 lines)     |
| 2    | `docs/llm/` | **YES**      | SSOT (token-optimized) |
| 3    | `docs/en/`  | **NO**       | Generated              |
| 4    | `docs/kr/`  | **NO**       | Translated             |

**Generation**: Manual only (`pnpm docs:generate`, `pnpm docs:translate`)

## NEVER / ALWAYS

| NEVER                 | Alternative             |
| --------------------- | ----------------------- |
| Duplicate types       | Use `packages/types`    |
| `prisma migrate`      | Use goose (SSOT)        |
| TEXT for IDs          | Native UUID with UUIDv7 |
| Prisma in Controllers | Use Services            |
| Hardcode secrets      | Use ConfigService       |
| External CDN links    | Self-host locally       |

| ALWAYS             | Details                    |
| ------------------ | -------------------------- |
| Types first        | Define in `packages/types` |
| `@Transactional()` | For multi-step DB ops      |
| 80% coverage       | CI blocks below threshold  |
| Include tests      | With all code changes      |
| Self-host fonts    | In design-tokens package   |

## Stack

| Category | Technology                                         |
| -------- | -------------------------------------------------- |
| Web      | React 19.2, Vite 7.2, TypeScript 5.9, Tailwind 4.1 |
| Backend  | Node.js 24, NestJS 11                              |
| Database | PostgreSQL 16, Prisma 6, Valkey                    |

**SSOT**: `docs/llm/rules.md`
