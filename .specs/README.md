# Specifications (SDD)

> Human-Commanded Staged Auto-Design | **Last Updated**: 2026-01-22

**Policy**: `docs/llm/policies/sdd.md`

## Core Concept

SDD transforms massive roadmaps into executable plans through staged automation:

- **Roadmap** defines WHAT to build (overall direction)
- **Scope** defines WHEN to build (work range extraction)
- **Tasks** defines HOW to build (detailed plan referencing CDD)

## Structure

```
.specs/
├── README.md
└── apps/{app}/
    ├── {feature}.md              # Feature Spec (detailed requirements)
    │
    ├── roadmap.md                # WHAT: Overall feature spec & direction
    │
    ├── scopes/                   # WHEN: Work scope extraction from roadmap
    │   └── {year}-{period}.md   # e.g., 2026-Q1.md
    │
    ├── tasks/                    # HOW: Detailed implementation (references CDD)
    │   └── {year}-{period}.md   # e.g., 2026-Q1.md
    │
    └── history/
        ├── scopes/               # Completed scope + tasks archives
        └── decisions/            # Roadmap decision records
```

## 3-Layer Structure: WHAT → WHEN → HOW

| Layer       | File                | Purpose       | Human Role       | LLM Role |
| ----------- | ------------------- | ------------- | ---------------- | -------- |
| **Roadmap** | `roadmap.md`        | WHAT to build | Design & Plan    | Document |
| **Scope**   | `scopes/{scope}.md` | WHEN to build | Define range     | Document |
| **Tasks**   | `tasks/{scope}.md`  | HOW to build  | Review & Approve | Generate |

### Key Insight

- Human never writes documents directly - LLM organizes and documents
- `tasks/{scope}.md` references **CDD (Tier 1-2)** to generate detailed implementation
- LLM autonomously divides tasks, determines order, groups parallel/sequential
- Human reviews and approves the generated tasks

## Task Execution Modes

Tasks are organized by execution mode:

```markdown
### Phase 1 (Parallel)

- [ ] Task A - can run simultaneously
- [ ] Task B - can run simultaneously

### Phase 2 (Sequential)

- [ ] Task C - must complete before D
- [ ] Task D - depends on C
```

## Multi-Scope (Concurrent Work)

| Person | Scope               | Tasks              |
| ------ | ------------------- | ------------------ |
| A      | `scopes/2026-Q1.md` | `tasks/2026-Q1.md` |
| B      | `scopes/2026-Q2.md` | `tasks/2026-Q2.md` |

No Git conflicts, independent progress.

## Token Load Strategy

| Situation  | Load                                    | Skip                   |
| ---------- | --------------------------------------- | ---------------------- |
| Planning   | `roadmap.md`                            | scopes, tasks, history |
| Work Start | `scopes/{scope}.md`, `tasks/{scope}.md` | roadmap, other scopes  |
| Continue   | `tasks/{scope}.md`                      | Everything else        |

## Specs Index

| App       | Spec                                                  | Status         |
| --------- | ----------------------------------------------------- | -------------- |
| web-admin | [menu-structure.md](apps/web-admin/menu-structure.md) | FINAL (97/100) |

## Active Scopes

| App       | Scope                                               | Status    |
| --------- | --------------------------------------------------- | --------- |
| web-admin | [2026-scope1](apps/web-admin/scopes/2026-scope1.md) | ⏳ Active |
