# Development Methodology

> Policy and roadmap for LLM-driven development

## Overview

This document defines the development methodology for LLM-assisted software development. It establishes the collaboration model between human architects and LLM implementers, optimizing for quality over quantity.

## Core Philosophy

### Primary Goal

Consistently guarantee **highest-quality output** instead of producing low-quality deliverables in bulk.

### Economic Principle

The most expensive resource is **expert labor**, not tools. The methodology optimizes for senior developer's time and creative immersion.

### Execution Strategy

Senior developers direct **3-5 projects simultaneously** by delegating all non-creative work to LLM agents.

| Delegate to LLM         | Reserve for Human        |
| ----------------------- | ------------------------ |
| Detailed planning       | Direction setting        |
| Code implementation     | Architecture decisions   |
| Documentation           | Code review              |
| Routine problem-solving | Creative problem-solving |

## Collaboration Model

### Human: The Architect

| Aspect           | Description                                 |
| ---------------- | ------------------------------------------- |
| Qualification    | Senior+ understanding 80%+ of project       |
| Role             | Manage entire project lifecycle             |
| Responsibilities | Planning, design, architecture, code review |
| Authority        | Approve plans, guarantee quality            |

The architect sets direction, makes key decisions, and ensures output quality. They don't write implementation code but review all significant changes.

### LLM: The Implementer

| Aspect     | Description                             |
| ---------- | --------------------------------------- |
| Role       | Resolve all unresolved internal details |
| Scope      | Plan generation, code implementation    |
| Autonomy   | Execute within approved boundaries      |
| Escalation | Only on consensus failure               |

The LLM executes within the boundaries set by the architect. It generates plans, implements code, and handles routine problem-solving autonomously.

## Three-Phase Architecture

The methodology consists of three complementary systems:

```
CDD (Context-Driven Development)     → Rules, patterns, conventions
    ↓
SDD (Spec-Driven Development)        → Tasks, roadmap, progress
    ↓
ADD (Agent-Driven Development)       → Autonomous execution
    ↓
Update CDD → Loop
```

| Phase | Status     | Documentation                       |
| ----- | ---------- | ----------------------------------- |
| CDD   | ✅ Active  | `docs/en/policies/cdd.md`           |
| SDD   | ✅ Active  | `docs/en/policies/sdd.md`           |
| ADD   | 🗓️ Planned | `docs/llm/policies/add.md` (future) |

### CDD (Context-Driven Development)

Provides the "how" - all rules, patterns, and conventions the LLM needs to produce consistent output. See `docs/en/policies/cdd.md` for details.

### SDD (Spec-Driven Development)

Provides the "what" - task specifications, roadmaps, and progress tracking. Human-approved specs drive LLM implementation. See `docs/en/policies/sdd.md` for details.

### ADD (Agent-Driven Development)

Provides autonomous execution capabilities with multi-LLM consensus for complex decisions. Currently in planning phase.

## Active Policies

### Currently Active

- Core Philosophy
- Collaboration Model
- CDD 4-Tier Structure
- SDD Basic Process
- Human Intervention Protocol

### Future Roadmap

| Component               | Phase       |
| ----------------------- | ----------- |
| SDD Learning Loop       | Medium-term |
| ADD Multi-LLM Consensus | Medium-term |
| ADD Distillation        | Long-term   |
| Custom LLM Ecosystem    | Long-term   |

## Human Intervention Protocol

When LLM needs human input:

| Requirement       | Description                     |
| ----------------- | ------------------------------- |
| Context Summary   | Concise problem description     |
| Attempts Made     | What self-resolution was tried  |
| Specific Question | Focused, actionable question    |
| Options           | Present choices with trade-offs |

**Response Types**:

- Update SDD (design change)
- Update CDD (new pattern)
- Direct guidance (one-time)

## Interaction Principles

### Architect Actions

- Set direction (what to build)
- Review and approve plans
- Code review final output
- Update policy (CDD) when patterns emerge
- Update design (SDD) when architecture changes

### Architect Does NOT

- Write implementation code
- Debug routine issues
- Handle repetitive tasks

### LLM Actions

- Generate detailed plans from intent
- Implement approved plans
- Self-resolve problems (using consensus if available)
- Request help only on consensus failure

## Related Documentation

- CDD Policy: `docs/en/policies/cdd.md`
- SDD Policy: `docs/en/policies/sdd.md`
- Detailed Concepts: `docs/en/policies/development-methodology-details.md`

---

_This document is auto-generated from `docs/llm/policies/development-methodology.md`_
