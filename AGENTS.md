# AGENTS.md

> **Multi-LLM Standard Policy** | **Last Updated**: 2026-01-21

## Purpose

This file defines the **standard policy** for all LLM agents.

Each agent (CLAUDE.md, GEMINI.md, etc.) MUST:

1. Follow this standard policy
2. Adapt to agent-specific characteristics
3. Update their own entry file when policy changes

---

## Development Methodology

**Full Documentation**: `docs/llm/policies/development-methodology.md`

### CDD (Context-Driven Development)

| Tier | Path        | Role                              |
| ---- | ----------- | --------------------------------- |
| 1    | `.ai/`      | Indicator (≤50 lines)             |
| 2    | `docs/llm/` | Detailed info (SSOT)              |
| 3    | `docs/en/`  | Human-readable (English, default) |
| 4    | `docs/kr/`  | Translation                       |

### SDD (Spec-Driven Development)

| Path                            | Role                          |
| ------------------------------- | ----------------------------- |
| `.specs/{app}/{feature}.md`     | Spec (What to build)          |
| `.specs/{app}/roadmap.md`       | L1: Roadmap (Human direction) |
| `.specs/{app}/tasks/current.md` | L2+L3: Scope + Tasks          |
| `.specs/{app}/history/`         | Task records → Future: DB MCP |

### History Separation

| Type        | Focus            | Storage           |
| ----------- | ---------------- | ----------------- |
| CDD History | Document changes | Git               |
| SDD History | Task completion  | `.specs/history/` |

### ADD (Agent-Driven Development)

| Item       | Description                                    |
| ---------- | ---------------------------------------------- |
| Definition | SDD automation                                 |
| Consensus  | n LLMs verify, call Human on consensus failure |
| Status     | Not implemented                                |

---

## CDD Rules

| Rule              | Description                                           |
| ----------------- | ----------------------------------------------------- |
| Tier 1 Max        | ≤50 lines per file                                    |
| Tier 2 Max        | ≤300 lines per file (split if exceeded)               |
| Weekly Cleanup    | Once/week - remove legacy, verify reliability         |
| Edit Permission   | LLM only (Human NEVER edits directly)                 |
| Post-Task         | Update CDD after task completion                      |
| Reference Mapping | Check `docs/llm/README.md` for task reference mapping |

## Essential Reading (All Tasks)

| Priority | File                    |
| -------- | ----------------------- |
| 1        | `.ai/rules.md`          |
| 2        | `.ai/best-practices.md` |
| 3        | `.ai/architecture.md`   |
| 4        | `docs/test-coverage.md` |

## Tier 2 Role Definition

| Path        | When to Read                            |
| ----------- | --------------------------------------- |
| `policies/` | First read or policy-related tasks      |
| `services/` | When working on that service (required) |
| `guides/`   | When implementing specific features     |
| `packages/` | When using/modifying that package       |

## Architecture & Stack

| Layer     | Tech                                                   |
| --------- | ------------------------------------------------------ |
| Frontend  | React 19.2, TypeScript 5.9, Tailwind CSS 4.1, Vite 7.3 |
| Backend   | Node.js 24, NestJS 11.1, GraphQL Federation, gRPC      |
| Database  | PostgreSQL 16, Prisma 7, Valkey                        |
| Messaging | Redpanda (Kafka-compatible)                            |
| Deploy    | Kubernetes, Kustomize, Cilium Gateway API              |

## Key Principles

| Principle         | Description                         |
| ----------------- | ----------------------------------- |
| Language          | English only (code, docs, commits)  |
| GitFlow           | `feat/* → develop → release → main` |
| Test Coverage     | 80% minimum                         |
| Types First       | `packages/types`                    |
| No Human Doc Edit | LLM handles all documentation       |

---

## Agent Entry Files

| Agent  | Entry File   | Responsibility                        |
| ------ | ------------ | ------------------------------------- |
| Claude | `CLAUDE.md`  | Based on AGENTS.md + Claude specifics |
| Gemini | `GEMINI.md`  | Based on AGENTS.md + Gemini specifics |
| GPT    | `GPT.md`     | Based on AGENTS.md + GPT specifics    |
| Others | `{AGENT}.md` | Based on AGENTS.md + Agent specifics  |

## Agent Update Rules

When this file (AGENTS.md) changes:

1. **Each agent MUST update their entry file**
2. Preserve agent-specific optimizations
3. Sync policy changes from AGENTS.md

---

**Policy SSOT**: This file is the single source of truth for multi-LLM policy.
