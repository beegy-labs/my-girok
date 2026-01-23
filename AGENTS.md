# AGENTS.md

<!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
<!-- BEGIN: STANDARD POLICY (Auto-synced from llm-dev-protocol)         -->
<!-- DO NOT EDIT this section manually in projects - changes will be    -->
<!-- overwritten. Edit in llm-dev-protocol and sync to all projects.    -->
<!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->

> **Multi-LLM Standard Policy** | **Version**: 1.0.0 | **Last Updated**: 2026-01-23

## Purpose

This file defines the **mandatory standard policy** for all LLM agents across all projects using llm-dev-protocol.

Each project MUST have agent-specific entry files (CLAUDE.md, GEMINI.md, etc.) that:

1. Import and follow this standard policy
2. Add agent-specific optimizations
3. Reference project-specific CDD (`.ai/`, `docs/llm/`)

---

## Development Methodology

**Full Documentation**: `docs/llm/policies/development-methodology.md`

### CDD (Context-Driven Development)

| Tier | Path        | Role                  | Editable | Max Lines |
| ---- | ----------- | --------------------- | -------- | --------- |
| 1    | `.ai/`      | Indicator (LLM)       | ✅ Yes   | ≤50       |
| 2    | `docs/llm/` | SSOT (LLM)            | ✅ Yes   | ≤200      |
| 3    | `docs/en/`  | Human-readable (Auto) | ⛔ No    | N/A       |
| 4    | `docs/kr/`  | Translation (Auto)    | ⛔ No    | N/A       |

**Policy**: `docs/llm/policies/cdd.md`

### SDD (Spec-Driven Development)

**3-Layer Structure: WHAT → WHEN → HOW**

| Layer | Path                 | Role                 | Human Role       |
| ----- | -------------------- | -------------------- | ---------------- |
| L1    | `.specs/roadmap.md`  | WHAT (features)      | Design & Plan    |
| L2    | `.specs/scopes/*.md` | WHEN (work range)    | Define scope     |
| L3    | `.specs/tasks/*.md`  | HOW (implementation) | Review & Approve |

**Optional**: `.specs/history/` for archiving completed scopes and decisions

**Policy**: `docs/llm/policies/sdd.md`

### ADD (Agent-Driven Development)

| Component           | Description                                   |
| ------------------- | --------------------------------------------- |
| Multi-Agent         | Parallel execution across multiple LLM agents |
| Consensus Protocol  | n LLMs verify, escalate on consensus failure  |
| Self-Resolution     | Attempt resolution before human intervention  |
| Auto-Capitalization | Experience → CDD updates                      |

**Policy**: `docs/llm/policies/add.md`

---

## CDD Rules

| Rule              | Description                                           |
| ----------------- | ----------------------------------------------------- |
| Tier 1 Max        | ≤50 lines per file                                    |
| Tier 2 Max        | ≤200 lines per file (split if exceeded)               |
| Weekly Cleanup    | Once/week - remove legacy, verify reliability         |
| Edit Permission   | LLM only (Human NEVER edits `.ai/` or `docs/llm/`)    |
| Post-Task         | Update CDD after task completion                      |
| Reference Mapping | Check `docs/llm/README.md` for task reference mapping |

## Essential Reading (All Tasks)

| Priority | File                    | Purpose             |
| -------- | ----------------------- | ------------------- |
| 1        | `.ai/rules.md`          | Core DO/DON'T rules |
| 2        | `.ai/best-practices.md` | Current guidelines  |
| 3        | `.ai/architecture.md`   | System patterns     |

## Tier 2 Role Definition

| Path        | When to Read                            |
| ----------- | --------------------------------------- |
| `policies/` | First read or policy-related tasks      |
| `services/` | When working on that service (required) |
| `guides/`   | When implementing specific features     |
| `packages/` | When using/modifying that package       |
| `apps/`     | When working on that application        |

## Key Principles

| Principle         | Description                                   |
| ----------------- | --------------------------------------------- |
| Language          | English only (code, docs, commits)            |
| No Human Doc Edit | LLM handles all `.ai/` and `docs/llm/` edits  |
| Token Efficiency  | Tables > prose, YAML > JSON                   |
| Cross-Reference   | `.ai/` always links to `docs/llm/`            |
| Git = CDD History | Use Git for document history, not manual logs |

---

## Agent Entry Files

Each project MUST have these files in root:

| Agent   | Entry File   | Responsibility                         |
| ------- | ------------ | -------------------------------------- |
| Claude  | `CLAUDE.md`  | Based on AGENTS.md + Claude specifics  |
| Gemini  | `GEMINI.md`  | Based on AGENTS.md + Gemini specifics  |
| Cursor  | `CURSOR.md`  | Based on AGENTS.md + Cursor specifics  |
| Copilot | `COPILOT.md` | Based on AGENTS.md + Copilot specifics |
| GPT     | `GPT.md`     | Based on AGENTS.md + GPT specifics     |
| Others  | `{AGENT}.md` | Based on AGENTS.md + Agent specifics   |

## Agent Entry File Structure

Each agent entry file MUST include:

```markdown
# {AGENT}.md

> **{Agent} Entry Point** | Based on [AGENTS.md](AGENTS.md) | **Last Updated**: YYYY-MM-DD

## Standard Policy

**MUST READ**: [AGENTS.md](AGENTS.md) - Multi-LLM Standard Policy (SSOT)

When AGENTS.md changes, update this file accordingly while preserving {Agent}-specific optimizations.

---

## {Agent}-Specific Optimizations

| Feature         | Optimization           |
| --------------- | ---------------------- |
| Context Window  | {size} - {description} |
| Code Generation | {strengths}            |
| Reasoning       | {characteristics}      |

---

## Quick Start

**Start here**: [.ai/README.md](.ai/README.md) - Navigation for all AI documentation

## Essential Reading

**For ANY task, read these first:**

1. **[.ai/rules.md](.ai/rules.md)** - Core DO/DON'T rules (CRITICAL)
2. **[.ai/best-practices.md](.ai/best-practices.md)** - Current best practices
3. **[.ai/architecture.md](.ai/architecture.md)** - Architecture patterns

{... project-specific sections ...}
```

## Agent Update Rules

When this file (AGENTS.md) changes:

1. **Each agent MUST update their entry file** within 24 hours
2. Preserve agent-specific optimizations
3. Sync policy changes from AGENTS.md
4. Update "Last Updated" timestamp

Automated sync is handled by `llm-dev-protocol` CI/CD pipeline.

---

## Directory Structure (Mandatory)

All projects using this standard MUST have:

```
project/
├── AGENTS.md           # This file (synced from llm-dev-protocol)
├── CLAUDE.md           # Agent entry (project-specific)
├── GEMINI.md           # Agent entry (project-specific)
│
├── .ai/                # CDD Tier 1 - EDITABLE
│   ├── README.md       # Navigation hub
│   ├── rules.md        # Core DO/DON'T
│   ├── architecture.md # System patterns
│   ├── best-practices.md
│   ├── services/       # Service indicators → docs/llm/services/
│   ├── packages/       # Package indicators → docs/llm/packages/
│   └── apps/           # App indicators
│
├── .specs/             # SDD - DEVELOPMENT BLUEPRINTS
│   ├── README.md       # Navigation
│   ├── roadmap.md      # L1: WHAT to build
│   ├── scopes/         # L2: WHEN to build
│   ├── tasks/          # L3: HOW to build
│   └── history/        # L4: DONE (archived)
│
├── docs/
│   ├── llm/            # CDD Tier 2 - EDITABLE (SSOT)
│   │   ├── README.md
│   │   ├── policies/   # Policy definitions
│   │   ├── services/   # Service full specs
│   │   ├── guides/     # Development guidelines
│   │   ├── packages/   # Package documentation
│   │   └── apps/       # Application specs
│   ├── en/             # CDD Tier 3 - GENERATED (DO NOT EDIT)
│   └── kr/             # CDD Tier 4 - TRANSLATED (DO NOT EDIT)
```

---

**Policy SSOT**: This file is the single source of truth for multi-LLM policy across all projects.

**Enforcement**: CI/CD pipeline validates and auto-fixes projects that drift from this standard.

**Version**: All projects must use the same AGENTS.md version for consistency.

<!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
<!-- END: STANDARD POLICY                                               -->
<!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->

---

<!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
<!-- BEGIN: PROJECT CUSTOM (Safe to edit in project repositories)      -->
<!-- Add project-specific configurations below this marker              -->
<!-- See: docs/llm/policies/agents-customization.md for guidelines      -->
<!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->

## Project-Specific Configuration (my-girok)

> **Last Updated**: 2026-01-23

### Architecture & Stack

| Layer         | Tech                                                   |
| ------------- | ------------------------------------------------------ |
| **Frontend**  | React 19.2, TypeScript 5.9, Tailwind CSS 4.1, Vite 7.3 |
| **Mobile**    | iOS (Swift), Android (Kotlin), Flutter                 |
| **Backend**   | Node.js 24, NestJS 11.1, GraphQL Federation, gRPC      |
| **Database**  | PostgreSQL 16, Prisma 7, Valkey                        |
| **Messaging** | Redpanda (Kafka-compatible)                            |
| **AI**        | Python 3.13, FastAPI                                   |
| **Deploy**    | Kubernetes, Kustomize, Cilium Gateway API              |

### Project-Specific Rules

| Principle         | Description                          |
| ----------------- | ------------------------------------ |
| Language          | English only (code, docs, commits)   |
| GitFlow           | `feat/* → develop → release → main`  |
| Test Coverage     | 80% minimum                          |
| Types First       | `packages/types`                     |
| Transaction       | `@Transactional()` for multi-step DB |
| No Human Doc Edit | LLM handles all documentation        |

### Essential Reading

| Priority | File                    |
| -------- | ----------------------- |
| 1        | `.ai/rules.md`          |
| 2        | `.ai/best-practices.md` |
| 3        | `.ai/architecture.md`   |
| 4        | `docs/test-coverage.md` |

<!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
<!-- END: PROJECT CUSTOM                                                -->
<!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
