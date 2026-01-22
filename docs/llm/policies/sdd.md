# Spec-Driven Development (SDD) Policy

> Task planning and tracking system | **Last Updated**: 2026-01-22

## Definition

SDD is a system where Human designs plans with LLM and tracks task execution. Specifications define what to build, while CDD provides how to build.

## CDD vs SDD

| Aspect     | CDD                     | SDD                       |
| ---------- | ----------------------- | ------------------------- |
| Focus      | How (context, patterns) | What (task, spec)         |
| Location   | `.ai/`, `docs/llm/`     | `.specs/`                 |
| History    | Git (document changes)  | Files → DB (task records) |
| Human Role | None                    | Direction, Approval       |

## Directory Structure

```
.specs/
├── README.md
└── apps/{app}/
    ├── {feature}.md              # Spec (What to build)
    │
    ├── roadmap.md                # L1: Master roadmap (overall direction)
    │                             # - Load only during planning sessions
    │
    ├── scopes/                   # L2: Active scopes (concurrent work support)
    │   ├── 2026-Q1.md           # Scope A (Person A)
    │   └── 2026-Q2.md           # Scope B (Person B)
    │
    ├── tasks/                    # L3: Scope-specific tasks
    │   ├── 2026-Q1.md           # Tasks for Scope A
    │   └── 2026-Q2.md           # Tasks for Scope B
    │
    └── history/
        ├── scopes/               # Completed scope archives
        │   └── 2025-Q4.md       # Scope + tasks combined record
        │
        └── decisions/            # Roadmap decision records
            └── {date}-{decision}.md
```

## 3-Layer Work Structure

| Layer          | File                | Owner     | Human Role         |
| -------------- | ------------------- | --------- | ------------------ |
| **L1 Roadmap** | `roadmap.md`        | Human     | Direction (Master) |
| **L2 Scope**   | `scopes/{scope}.md` | Human+LLM | **Approval**       |
| **L3 Tasks**   | `tasks/{scope}.md`  | LLM       | Autonomous         |

## File Roles (Token Optimization)

| File                 | Content              | Token Strategy          |
| -------------------- | -------------------- | ----------------------- |
| `roadmap.md`         | Master roadmap (all) | **Planning only** load  |
| `scopes/{scope}.md`  | Current work scope   | Load at work start      |
| `tasks/{scope}.md`   | Detailed tasks       | Always load during work |
| `history/scopes/`    | Completed scopes     | **Skip during work**    |
| `history/decisions/` | Decision records     | Load only when needed   |

## Multi-Scope: Concurrent Work Support

```yaml
scenario:
  person_a: 'Q1 - Menu structure'
  person_b: 'Q2 - Dashboard'

files:
  person_a:
    load: ['scopes/2026-Q1.md', 'tasks/2026-Q1.md']
    skip: ['roadmap.md', 'scopes/2026-Q2.md', 'tasks/2026-Q2.md', 'history/*']

  person_b:
    load: ['scopes/2026-Q2.md', 'tasks/2026-Q2.md']
    skip: ['roadmap.md', 'scopes/2026-Q1.md', 'tasks/2026-Q1.md', 'history/*']

benefit:
  - 'No Git conflicts'
  - 'Same token count (2 files)'
  - 'Independent progress'
```

## Token Load Strategy

| Situation       | Load                                    | Skip                                    |
| --------------- | --------------------------------------- | --------------------------------------- |
| **Planning**    | `roadmap.md`                            | `scopes/*`, `tasks/*`, `history/*`      |
| **Work Start**  | `scopes/{scope}.md`, `tasks/{scope}.md` | `roadmap.md`, other scopes, `history/*` |
| **Continue**    | `tasks/{scope}.md`                      | Everything else                         |
| **Review Done** | `history/scopes/{scope}.md`             | Active files                            |

## Scope ID Format

```
{year}-{period}
```

| Component | Description   | Example              |
| --------- | ------------- | -------------------- |
| year      | Year          | `2026`               |
| period    | Quarter/Phase | `Q1`, `Q2`, `Phase1` |
| Full ID   | Combined      | `2026-Q1`            |

## Workflow

```
L1: roadmap.md (Master direction)
    ↓ Architect selects scope
L2: scopes/{scope}.md (Human approval)
    ↓ LLM details
L3: tasks/{scope}.md (LLM execution)
    ↓ Complete
history/scopes/{scope}.md (Archive)
    ↓
Post-Task: CDD Update
```

## Scope Lifecycle

```yaml
create:
  trigger: 'Architect selects range from roadmap'
  action: 'Create scopes/{scope}.md + tasks/{scope}.md'

active:
  work: 'LLM implements tasks'
  update: 'Progress tracked in tasks/{scope}.md'

complete:
  trigger: 'All tasks done'
  action:
    - 'Merge scope + tasks → history/scopes/{scope}.md'
    - 'Delete active files'
    - 'Update CDD if patterns found'
```

## File Templates

### roadmap.md (L1)

```markdown
# Roadmap

> L1: Master direction | Load on planning only

## 2026

| Q   | Priority | Feature        | Status              |
| --- | -------- | -------------- | ------------------- |
| Q1  | P0       | Menu structure | → scopes/2026-Q1.md |
| Q2  | P0       | Dashboard      | Pending             |
| Q3  | P0       | Audit center   | Pending             |

## Dependencies

- Menu → Dashboard → Audit
```

### scopes/{scope}.md (L2)

```markdown
# Scope: 2026-Q1

> L2: Human approval required | Extracted from roadmap

## Target

Menu structure implementation

## Period

2026-01-01 ~ 2026-03-31

## Items

| Priority | Feature           | Status |
| -------- | ----------------- | ------ |
| P0       | Menu config       | ⏳     |
| P1       | Route setup       | ⏳     |
| P2       | Permission checks | ⏳     |

## Success Criteria

- All menu items functional
- Permission-based visibility
- 80% test coverage
```

### tasks/{scope}.md (L3)

```markdown
# Tasks: 2026-Q1

> L3: LLM autonomous | Based on scopes/2026-Q1.md

## Active

- [ ] Update menu.config.ts

## Pending

- [ ] Add Identity routes
- [ ] Add Access routes
- [ ] Implement permission checks

## Completed

- [x] Analyze current structure (01-20)

## Blocked

(none)
```

### history/scopes/{scope}.md

```markdown
# Completed: 2025-Q4

> Archived scope + tasks

## Summary

Settings UI implementation

## Period

2025-10-01 ~ 2025-12-31

## Deliverables

- Settings pages (Phase 9)
- Permission management (Phase 4)

## Tasks Completed

| Task             | Date  |
| ---------------- | ----- |
| Settings config  | 12-15 |
| Feature flags UI | 12-20 |
| Country config   | 12-28 |

## CDD Updated

- .ai/apps/web-admin.md
```

## Best Practices

| Practice                 | Description                             |
| ------------------------ | --------------------------------------- |
| Roadmap = Planning only  | Do not load during work                 |
| Scope = 1 person 1 scope | Separate scopes for concurrent work     |
| Tasks = Focused          | Include only current scope tasks        |
| History = Archive only   | Save after completion, skip during work |
| Naming = Consistent      | Follow `{year}-{period}` format         |

## Future: DB Migration

```
Current: .specs/history/*.md (Git)
    ↓
Future:  DB MCP
         - Searchable
         - Zero tokens (query on demand)
         - Analytics support
```

## References

- Methodology: `docs/llm/policies/development-methodology.md`
- CDD Policy: `docs/llm/policies/cdd.md`
- Industry Best Practices: Thoughtworks SDD, Addy Osmani Workflow
