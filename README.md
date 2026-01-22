# My-Girok

> Personal Playground for LLM-Driven Development Methodology

This is a **personal hobby project** serving as a testbed for establishing and validating LLM-driven development methodologies. The application itself (personal information management) is secondary - the primary goal is to define and refine **CDD**, **SDD**, and **ADD** workflows.

![Node](https://img.shields.io/badge/node-24.x-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.9-blue.svg)
![NestJS](https://img.shields.io/badge/nestjs-11-red.svg)
![React](https://img.shields.io/badge/react-19-blue.svg)

---

## Disclaimer

**This is a personal playground.**

- Not intended for production use
- Methodologies are experimental and under active refinement
- No guarantees of stability or completeness

---

## Validation Status

| Phase   | Methodology                      | Status         |
| ------- | -------------------------------- | -------------- |
| Phase 1 | CDD (Context-Driven Development) | ✅ Complete    |
| Phase 2 | SDD (Spec-Driven Development)    | 🚧 In Progress |
| Phase 3 | ADD (Agent-Driven Development)   | ⏳ Pending     |

---

## Policy: High-Quality LLM Development System Under Senior Developer Command

### 1. Core Philosophy: Quality Assurance Through Senior Developer's Creative Immersion

**Primary Goal**: Instead of mass-producing low-quality outputs, consistently guarantee **highest-quality deliverables**.

**Economic Principle**: The most expensive element in development is not tools but **expert labor costs**. Therefore, all decisions are made to **maximize efficient use of senior developer's time and creative flow state (Vibe)**.

**Execution Strategy**: Enable **senior developers** to command 3-5 projects simultaneously by aggressively delegating all non-creative work to LLM agents.

> **Strategic Rationale**: This strategy is based on the clear observation that **"the quality of output can never exceed the CS (Computer Science) fundamentals of the developer who created it."** Developers lacking CS competency inevitably produce results matching their level. Therefore, the only way to absolutely guarantee high quality is to eliminate risk from human variance at its source. Automated LLM agents commanded by senior developers handle all implementation, completely blocking quality degradation from human developer capability differences.

**Ultimate Goal ('Vibe Coding')**: This architecture aims to **support senior developers in focusing solely on project direction, big-picture design, and high-level creative problem-solving (Vibe Coding)** - perfectly protected from unnecessary context switching, repetitive tasks, implementation constraints, and unpredictable interruptions.

---

### 2. Collaboration Model: 'Commander' and 'Autonomous Implementer'

#### Human (The Commander)

| Aspect             | Description                                                                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Qualification**  | Senior-level expert understanding 80%+ of the project                                                                                         |
| **Role**           | Instead of writing code directly, oversees entire project lifecycle: **planning, design, implementation architecture, and final code review** |
| **Responsibility** | Designs overall 'Flow', reviews and approves LLM-generated plans, guarantees final output quality through code review                         |

#### LLM (The Implementer & Assistant)

| Aspect    | Description                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------------ |
| **Role**  | Resolves **all concrete internal details** based on Commander's designed 'Flow'                        |
| **Scope** | Detailed plan document generation, actual code implementation, and autonomous problem-solving attempts |

---

### 3. Three-Phase Policy & Workflow: CDD, SDD, ADD

#### Phase 1: CDD (Context-Driven Development) — Constitution of Knowledge

**Purpose**: **Single Source of Truth (SSOT)** defining all rules and patterns for LLM to generate consistent, high-quality outputs.

**Core Functions**:

| Tier      | Purpose                                                                                       | Optimization                                                                                     |
| --------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Tier 1, 2 | Core technical docs and essential rules for current task                                      | Maintain optimal size and high density for token efficiency                                      |
| Tier 3, 4 | Human-friendly docs (external memory) helping Commander quickly grasp context across projects | Reduces cognitive burden of maintaining 'deep context'; Onboarding material for new team members |

**Structure**:

```
.ai/                    # Tier 1: Indicators (~20 lines each)
docs/llm/               # Tier 2: SSOT (Full specifications)
docs/en/                # Tier 3: Generated human docs
docs/kr/                # Tier 4: Translated docs
```

---

#### Phase 2: SDD (Spec-Driven Development) — Human-Commanded Staged Auto-Design & Learning

**Purpose**: Auto-convert each Commander-designated stage from massive roadmap into executable detailed plans, **learning from design feedback** to progressively improve.

**Process**:

```
┌─────────────────────────────────────────────────────────────────┐
│  1. [Human] Roadmap Command                                     │
│     Commander decides which stage to execute from roadmap       │
│     This becomes the specific Intent for LLM                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. [LLM] Stage-by-Stage Plan Generation                        │
│     Planning LLM generates detailed execution plan              │
│     References CDD, scoped to Commander-designated stage only   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. [Human] Plan Review & Execution Approval                    │
│     Commander reviews generated plan                            │
│     Modifies directly if needed, then approves execution        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  4. [System] Design Feedback Learning                           │
│     If Commander modified plan, diff becomes learning data      │
│     Analyzed through 'Experience Capitalization' process        │
│     Used to improve Planning LLM's future output                │
└─────────────────────────────────────────────────────────────────┘
```

**Structure**:

```
.specs/
└── apps/{app}/
    ├── roadmap.md          # L1: Master direction (Human)
    ├── scopes/{scope}.md   # L2: Implementation scope (Human + LLM)
    └── tasks/{scope}.md    # L3: Detailed tasks (LLM autonomous)
```

---

#### Phase 3: ADD (Agent-Driven Development) — Optimized Autonomous Execution & Learning

**Purpose**: Autonomously execute approved plans, **capitalize experiences as system-wide knowledge** to progressively improve.

**Process**:

```
┌─────────────────────────────────────────────────────────────────┐
│  1. [LLM] L3 Implementation                                     │
│     Coder LLM autonomously implements code per plan             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. [LLM] Self-Resolution                                       │
│     On problems, does NOT immediately interrupt human           │
│     Summons peer implementers (multi-LLM)                       │
│     Resolves through AI consensus + execution environment tests │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. [Human] Final Intervention (Only if consensus fails)        │
│     System requests help with 'Incident Report'                 │
│     Commander does NOT fix code directly                        │
│     Instead: Updates design (SDD) or corrects policy (CDD)      │
│     Then restarts system                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  4. [System] Experience Capitalization (Distillation)           │
│     All trials, problem-solving, human interventions recorded   │
│     Extract abstracted core principles applicable system-wide   │
│     Update CDD (Tier 1, 2)                                      │
│     System improves through experience                          │
│     Prevents active context bloat                               │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4. Long-Term Vision: Building Proprietary LLM Ecosystem

All data accumulated through this architecture (human goal presentations, LLM plan generations, human plan modifications, LLM code implementations, final deliverables) transcends mere history to become **the most valuable asset for training a 'proprietary LLM' perfectly adapted to the company's unique development context**.

Long-term, this system aims to **build an independent LLM ecosystem** that thinks and codes in our own way, reducing dependency on external general-purpose LLMs. This is the final stage of escaping technological dependency and making the company's development capability itself a permanent competitive advantage.

---

## Contribution Policy

**All changes must be made through LLM.**

- Do NOT submit Pull Requests directly
- Create Issues to describe requirements
- LLM will implement and create PRs

This ensures methodology validation - if humans edit code directly, the experiment is invalidated.

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

## Current Status

### Active Scope: Email Service (Scope 1)

```
.specs/apps/web-admin/
├── roadmap.md              # 6 scopes defined
├── scopes/2026-scope1.md   # Email Service spec (Complete)
└── tasks/2026-scope1.md    # 16 implementation steps
```

See [roadmap](.specs/apps/web-admin/roadmap.md) for full scope list.

---

## License

MIT License - see [LICENSE](LICENSE)
