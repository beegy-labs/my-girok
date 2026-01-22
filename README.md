# My-Girok

> LLM-Driven Development Methodology Playground

This repository is a **hobby project** used as a testbed for establishing and validating LLM-driven development methodologies. The actual application (personal information management) is secondary - the primary goal is to define and refine **CDD**, **SDD**, and **ADD** workflows.

![Node](https://img.shields.io/badge/node-24.x-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.9-blue.svg)
![NestJS](https://img.shields.io/badge/nestjs-11-red.svg)
![React](https://img.shields.io/badge/react-19-blue.svg)

---

## Purpose

**Establish and validate LLM-first development methodologies:**

- Define clear boundaries between human direction and LLM execution
- Create reusable patterns for LLM-assisted software development
- Validate that complex systems can be built entirely through LLM interactions

**Core Principle:**

> All code, documentation, and configurations are generated exclusively through LLM.
> Humans provide direction only. LLM executes all changes.

---

## Methodologies Under Validation

### CDD (Context-Driven Development)

**What**: Structured documentation optimized for LLM context loading

**Purpose**: Enable LLM to understand codebase patterns, boundaries, and conventions quickly

**Implementation**:

```
.ai/                    # Tier 1: Indicators (~20 lines each)
├── services/*.md       # Service boundaries, APIs, patterns
├── apps/*.md           # App structure, routing
└── rules.md            # Core DO/DON'T rules

docs/llm/               # Tier 2: SSOT (Full specifications)
├── policies/*.md       # Development policies
├── services/*.md       # Detailed service docs
└── guides/*.md         # Implementation guides
```

**Key Concept**: Token-efficient documentation hierarchy - load minimal context for quick tasks, full context for complex tasks.

---

### SDD (Spec-Driven Development)

**What**: Task planning and tracking system for LLM execution

**Purpose**: Break down human requirements into LLM-executable specifications

**Implementation**:

```
.specs/
└── apps/{app}/
    ├── roadmap.md          # L1: Master direction (Human)
    ├── scopes/{scope}.md   # L2: Implementation scope (Human + LLM)
    └── tasks/{scope}.md    # L3: Detailed tasks (LLM autonomous)
```

**3-Layer Structure**:

| Layer      | File          | Owner       | Human Role |
| ---------- | ------------- | ----------- | ---------- |
| L1 Roadmap | `roadmap.md`  | Human       | Direction  |
| L2 Scope   | `scopes/*.md` | Human + LLM | Approval   |
| L3 Tasks   | `tasks/*.md`  | LLM         | Autonomous |

**Key Concept**: Humans define "what" at high level; LLM breaks down into executable tasks and implements autonomously.

---

### ADD (AI-Driven Development)

**What**: End-to-end implementation workflow through LLM

**Purpose**: Validate that LLM can handle complete development lifecycle

**Workflow**:

```
Human Direction
      ↓
┌─────────────────────────────────────┐
│  SDD: Planning                      │
│  - Read roadmap                     │
│  - Create scope specification       │
│  - Break down into tasks            │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│  CDD: Context Loading               │
│  - Load relevant .ai/ indicators    │
│  - Load docs/llm/ policies          │
│  - Understand existing patterns     │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│  ADD: Implementation                │
│  - Write code following patterns    │
│  - Write tests (80%+ coverage)      │
│  - Update CDD documentation         │
│  - Create commits and PRs           │
└─────────────────────────────────────┘
      ↓
Human Review & Merge
```

**Key Concept**: LLM operates autonomously within defined boundaries. Humans only intervene at approval checkpoints.

---

## Validation Metrics

| Metric             | Target    | Purpose                    |
| ------------------ | --------- | -------------------------- |
| Human Edits        | 0         | Validate full LLM autonomy |
| Test Coverage      | 80%+      | Validate code quality      |
| Documentation Sync | 100%      | Validate CDD maintenance   |
| Task Completion    | Per scope | Validate SDD effectiveness |

---

## Project Structure

```
my-girok/
├── CLAUDE.md                 # LLM Entry Point (Claude-specific)
├── AGENTS.md                 # Multi-LLM Standard Policy
│
├── .ai/                      # CDD Tier 1: Indicators
├── .specs/                   # SDD: Specifications
├── docs/llm/                 # CDD Tier 2: SSOT
│
├── apps/                     # Frontend applications
├── services/                 # Backend microservices
└── packages/                 # Shared packages
```

## Tech Stack (Test Subject)

| Layer     | Technology                                         |
| --------- | -------------------------------------------------- |
| Frontend  | React 19.2, Vite 7.3, TypeScript 5.9, Tailwind 4.1 |
| Backend   | Node.js 24, NestJS 11.1, Prisma 7, gRPC            |
| Database  | PostgreSQL 16, ClickHouse                          |
| Cache     | Valkey (Redis-compatible)                          |
| Messaging | Redpanda (Kafka-compatible)                        |
| Infra     | Kubernetes, Helm, ArgoCD                           |

---

## Getting Started

### For Methodology Research

1. Read `docs/llm/policies/cdd.md` - CDD policy
2. Read `docs/llm/policies/sdd.md` - SDD policy
3. Read `docs/llm/policies/development-methodology.md` - ADD workflow
4. Explore `.specs/apps/web-admin/` - Active SDD example

### For LLM Interaction

1. Start with `CLAUDE.md` (Claude) or `AGENTS.md` (other LLMs)
2. LLM loads context from `.ai/` based on task
3. LLM follows SDD workflow for implementation

---

## Current Status

### Active Scope: Email Service (Scope 1)

```
.specs/apps/web-admin/
├── roadmap.md              # 6 scopes defined
├── scopes/2026-scope1.md   # Email Service spec ✅
└── tasks/2026-scope1.md    # 16 implementation steps
```

See [roadmap](.specs/apps/web-admin/roadmap.md) for full scope list.

---

## License

MIT License - see [LICENSE](LICENSE)

---

> **Note**: This is a hobby project. The methodologies defined here are experimental and under active refinement.
