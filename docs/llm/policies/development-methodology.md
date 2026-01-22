# Development Methodology

> Policy & Roadmap for LLM-Driven Development | **Last Updated**: 2026-01-22

---

## Document Purpose

This document defines:

- **Policy**: Principles and rules to apply immediately
- **Roadmap**: Future capabilities to build incrementally

All CDD, SDD, ADD architectural decisions are based on this document.

---

## 1. Core Philosophy

> **Type**: Policy (Immediate)

### 1.1 Primary Goal

Consistently guarantee **highest-quality output** instead of producing low-quality deliverables in bulk.

### 1.2 Economic Principle

The most expensive resource is **expert labor**, not tools. All decisions optimize:

- Senior developer's time
- Creative immersion state (Vibe)

### 1.3 Execution Strategy

Enable senior developers to direct **3-5 projects simultaneously** by delegating all non-creative work to LLM agents.

| Delegate to LLM         | Reserve for Human        |
| ----------------------- | ------------------------ |
| Detailed planning       | Direction setting        |
| Code implementation     | Architecture decisions   |
| Documentation           | Code review              |
| Routine problem-solving | Creative problem-solving |

### 1.4 Strategic Rationale

> "Output quality never exceeds the developer's CS fundamentals"

- Junior developers produce junior-quality output
- Solution: Remove human variance by having **senior-directed LLM agents** handle all implementation
- Result: Consistent high quality regardless of team composition

### 1.5 Ultimate Goal: Vibe Coding

Protect senior developers from:

| Threat                     | Protection                    |
| -------------------------- | ----------------------------- |
| Context switching          | Single-project focus sessions |
| Repetitive tasks           | Full LLM delegation           |
| Implementation constraints | High-level thinking only      |
| Unpredictable interrupts   | Self-resolving LLM agents     |

**Result**: Focus exclusively on direction, design, and creative problem-solving.

---

## 2. Collaboration Model

> **Type**: Policy (Immediate)

### 2.1 Human: The Architect

| Aspect           | Description                                        |
| ---------------- | -------------------------------------------------- |
| Qualification    | Senior+ expert understanding 80%+ of project       |
| Primary Role     | Manage entire project lifecycle (not writing code) |
| Responsibilities | Planning, design, architecture, code review        |
| Authority        | Approve plans, guarantee quality, final decisions  |

### 2.2 LLM: The Implementer

| Aspect     | Description                                           |
| ---------- | ----------------------------------------------------- |
| Role       | Resolve all unresolved internal details               |
| Scope      | Plan generation, code implementation, self-resolution |
| Autonomy   | Execute within approved boundaries                    |
| Escalation | Only on consensus failure                             |

### 2.3 Interaction Principles

```yaml
architect_actions:
  - 'Set direction (what to build)'
  - 'Review and approve plans'
  - 'Code review final output'
  - 'Update policy (CDD) when patterns emerge'
  - 'Update design (SDD) when architecture changes'

architect_does_not:
  - 'Write implementation code'
  - 'Debug routine issues'
  - 'Handle repetitive tasks'

llm_actions:
  - 'Generate detailed plans from intent'
  - 'Implement approved plans'
  - 'Self-resolve problems (consensus)'
  - 'Request help only on consensus failure'
```

---

## 3. Three-Phase Architecture

> **Type**: Policy (Framework) + Roadmap (Advanced Features)

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 1: CDD                                │
│                 (Constitution of Knowledge)                     │
│                                                                 │
│   SSOT for rules, patterns, conventions                         │
│   Status: ✅ Policy - Active                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 2: SDD                                │
│              (Human-Directed Design)                            │
│                                                                 │
│   Architect directs → LLM plans → Architect approves            │
│   Status: ✅ Policy - Active                                    │
│   Roadmap: Learning loop from plan modifications                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 3: ADD                                │
│              (Autonomous Execution)                             │
│                                                                 │
│   LLM implements → Self-resolves → Escalates if needed          │
│   Status: ✅ Policy - Basic | 🗓️ Roadmap - Consensus, Distill  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Update CDD → Loop
```

---

## 4. CDD (Context-Driven Development)

> **Type**: Policy (Immediate) | **Details**: `cdd.md`

**Constitution of Knowledge** - SSOT defining all rules and patterns for consistent, high-quality LLM output.

| Aspect   | Summary                               |
| -------- | ------------------------------------- |
| Location | `.ai/` (Tier 1), `docs/llm/` (Tier 2) |
| Purpose  | Rules, patterns, conventions          |
| History  | Git (`git log`, `git blame`)          |
| Scope    | Architecture, policies, NOT tasks     |

**Full specification**: `docs/llm/policies/cdd.md`

---

## 5. SDD (Spec-Driven Development)

> **Type**: Policy (Basic) + Roadmap (Learning Loop) | **Details**: `sdd.md`

**Human-Directed Step-by-Step Design** - Architect directs roadmap execution, LLM generates detailed plans. Supports concurrent multi-scope work.

| Aspect    | Summary                               |
| --------- | ------------------------------------- |
| Location  | `.specs/`                             |
| Structure | L1 Roadmap → L2 Scope → L3 Tasks      |
| History   | `.specs/history/` (files → future DB) |
| Scope     | Tasks, roadmap, progress              |

**Full specification**: `docs/llm/policies/sdd.md`

---

## 6. ADD (Agent-Driven Development)

> **Type**: Policy (Basic) + Roadmap (Consensus, Distillation) | **Details**: `add.md` (planned)

**Note**: ADD detailed policy will be documented in `add.md` when consensus and distillation features are implemented.

### 6.1 Definition

**Optimized Autonomous Execution** - Execute approved plans with minimal human interruption, protecting Architect's creative immersion.

### 6.2 Core Process (Policy - Active)

```yaml
step_1:
  actor: 'LLM (Coder)'
  action: 'Implement code according to approved plan'

step_2:
  trigger: 'Problem during implementation'
  action: 'Attempt self-resolution before escalating'

step_3:
  trigger: 'Self-resolution failed'
  action: 'Escalate to Architect with context'
```

### 6.3 Why Self-Resolution First?

| Factor     | Impact of Immediate Escalation       |
| ---------- | ------------------------------------ |
| Throughput | Senior developer capacity is limited |
| Vibe       | Interrupts break creative immersion  |
| Efficiency | System-wide efficiency degrades      |

### 6.4 Human Intervention Protocol (Policy - Active)

When escalation is necessary:

| Requirement       | Description                     |
| ----------------- | ------------------------------- |
| Context Summary   | Concise problem description     |
| Attempts Made     | What self-resolution was tried  |
| Specific Question | Focused, actionable question    |
| Options           | Present choices with trade-offs |

**Architect Response Options**:

| Response Type   | When to Use               |
| --------------- | ------------------------- |
| Update SDD      | Design/architecture issue |
| Update CDD      | Pattern/policy issue      |
| Direct guidance | One-time clarification    |

### 6.5 Multi-LLM Consensus (Roadmap - Future)

```yaml
status: '🗓️ Roadmap'
phase: 'Medium-term'

process:
  1: 'Problem occurs during implementation'
  2: 'Summon peer LLMs for verification'
  3: 'Each LLM independently evaluates'
  4: 'Consensus reached → proceed'
  5: 'Consensus failed → escalate to Architect'

validation_requirement:
  - 'Consensus alone is insufficient'
  - 'Must include execution-based verification'
  - 'Tests, linting, compilation required'

config:
  threshold: '2+ failures triggers escalation'
  configurable: true
```

### 6.6 Experience Distillation (Roadmap - Future)

```yaml
status: '🗓️ Roadmap'
phase: 'Long-term'

process:
  1_record:
    what: 'All trial-and-error, resolutions, escalations'
    where: 'History repository'

  2_analyze:
    who: 'System + Architect review'
    what: 'Identify patterns worth preserving'

  3_distill:
    action: 'Extract abstracted principles'
    output: 'Candidate CDD updates'

  4_apply:
    action: 'Update CDD (Tier 1, 2)'
    require: 'Architect approval'

benefit:
  - 'System learns from experience'
  - 'Prevents repeated mistakes'
  - 'Keeps active context lean (no bloat)'
```

---

## 7. Long-Term Vision

> **Type**: Roadmap (Long-term)

### 7.1 Data as Asset

All accumulated data becomes training assets:

| Data Type      | Source                  | Value           |
| -------------- | ----------------------- | --------------- |
| Intent         | Human goal statements   | What we want    |
| Plans          | LLM-generated plans     | How we plan     |
| Modifications  | Architect's plan edits  | Tacit knowledge |
| Implementation | Final code              | How we build    |
| Resolutions    | Problem-solving records | How we fix      |

### 7.2 Phased Approach

```yaml
phase_1_current:
  approach: 'External LLM + CDD/SDD/ADD framework'
  focus: 'Process optimization, data collection'

phase_2_medium:
  approach: 'RAG + Fine-tuned adapters'
  prerequisite: 'Sufficient high-quality examples'
  benefit: 'Domain-specialized responses'

phase_3_long:
  approach: 'Custom LLM ecosystem'
  prerequisite: 'Large dataset + ML capability + ROI validation'
  benefit: 'Full independence, competitive advantage'
```

### 7.3 Ultimate Goal

Build an **independent LLM ecosystem** that:

- Thinks and codes in our way
- Reduces external LLM dependency
- Transforms development capability into permanent competitive advantage

---

## 8. Summary: Policy vs Roadmap

### Immediate (Policy - Active Now)

| Component                   | Status   |
| --------------------------- | -------- |
| Core Philosophy             | ✅ Apply |
| Collaboration Model         | ✅ Apply |
| CDD 4-Tier Structure        | ✅ Apply |
| SDD Basic Process           | ✅ Apply |
| ADD Basic Execution         | ✅ Apply |
| Human Intervention Protocol | ✅ Apply |

### Future (Roadmap)

| Component               | Phase       | Prerequisite                        |
| ----------------------- | ----------- | ----------------------------------- |
| SDD Learning Loop       | Medium-term | Feedback infrastructure             |
| ADD Multi-LLM Consensus | Medium-term | Multi-agent setup                   |
| ADD Distillation        | Long-term   | History repository + review process |
| Custom LLM Ecosystem    | Long-term   | Data + ML capability + ROI          |

---

## References

| Policy | File                       | Status     |
| ------ | -------------------------- | ---------- |
| CDD    | `docs/llm/policies/cdd.md` | ✅ Active  |
| SDD    | `docs/llm/policies/sdd.md` | ✅ Active  |
| ADD    | `docs/llm/policies/add.md` | 🗓️ Planned |
