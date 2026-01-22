# Development Methodology

> Policy & Roadmap for LLM-Driven Development | **Last Updated**: 2026-01-22

## Core Philosophy

### Primary Goal

Consistently guarantee **highest-quality output** instead of producing low-quality deliverables in bulk.

### Economic Principle

The most expensive resource is **expert labor**, not tools. Optimize for senior developer's time and creative immersion.

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

### LLM: The Implementer

| Aspect     | Description                             |
| ---------- | --------------------------------------- |
| Role       | Resolve all unresolved internal details |
| Scope      | Plan generation, code implementation    |
| Autonomy   | Execute within approved boundaries      |
| Escalation | Only on consensus failure               |

## Three-Phase Architecture

```
CDD (Context-Driven Development)     → Rules, patterns, conventions
    ↓
SDD (Spec-Driven Development)        → Tasks, roadmap, progress
    ↓
ADD (Agent-Driven Development)       → Autonomous execution
    ↓
Update CDD → Loop
```

| Phase | Status     | Details           |
| ----- | ---------- | ----------------- |
| CDD   | ✅ Active  | `cdd.md`          |
| SDD   | ✅ Active  | `sdd.md`          |
| ADD   | 🗓️ Planned | `add.md` (future) |

## Summary: Policy vs Roadmap

### Active Now

- Core Philosophy
- Collaboration Model
- CDD 4-Tier Structure
- SDD Basic Process
- ADD Basic Execution
- Human Intervention Protocol

### Future Roadmap

| Component               | Phase       |
| ----------------------- | ----------- |
| SDD Learning Loop       | Medium-term |
| ADD Multi-LLM Consensus | Medium-term |
| ADD Distillation        | Long-term   |
| Custom LLM Ecosystem    | Long-term   |

## References

| Policy | File                       | Status     |
| ------ | -------------------------- | ---------- |
| CDD    | `docs/llm/policies/cdd.md` | ✅ Active  |
| SDD    | `docs/llm/policies/sdd.md` | ✅ Active  |
| ADD    | `docs/llm/policies/add.md` | 🗓️ Planned |

---

_Full details: `development-methodology-details.md`_
