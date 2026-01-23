# Spec-Driven Development (SDD) Policy

> Human-Commanded Staged Auto-Design | **Last Updated**: 2026-01-22

## Definition

SDD is a system where Human Commander orchestrates development through staged design automation. The Commander designates work stages from the roadmap, and LLM auto-converts them into executable detailed plans by referencing CDD.

**Core Principle**: Transform massive roadmap into manageable execution plans, stage by stage, under human command.

## CDD ↔ SDD Relationship

| Aspect       | CDD                      | SDD                             |
| ------------ | ------------------------ | ------------------------------- |
| **Focus**    | HOW (patterns, context)  | WHAT (specs, tasks)             |
| **Location** | `.ai/`, `docs/llm/`      | `.specs/`                       |
| **Role**     | Implementation reference | Task planning & tracking        |
| **Link**     | Referenced by tasks      | Tasks reference CDD to know HOW |

**Key Insight**: `tasks/{scope}.md` references CDD (Tier 1-2) to generate detailed implementation methods. CDD defines patterns, SDD defines what to build using those patterns.

## Directory Structure

```
.specs/
├── README.md
└── apps/{app}/
    ├── {feature}.md              # Feature Spec (detailed requirements)
    │
    ├── roadmap.md                # WHAT: Overall feature spec & direction
    │                             # - All planned features
    │                             # - Priorities & dependencies
    │                             # - Load only during planning
    │
    ├── scopes/                   # WHEN: Work scope extraction
    │   ├── 2026-Q1.md           # Q1 work scope (from roadmap)
    │   └── 2026-Q2.md           # Q2 work scope (from roadmap)
    │
    ├── tasks/                    # HOW: Detailed implementation plan
    │   ├── 2026-Q1.md           # Q1 tasks (references CDD)
    │   └── 2026-Q2.md           # Q2 tasks (references CDD)
    │
    └── history/                  # DONE: Completed archives
        ├── scopes/               # Completed scope + tasks merged
        └── decisions/            # Roadmap decision records
```

## 3-Layer Structure: WHAT → WHEN → HOW

| Layer       | File                | Purpose           | Human Role       | LLM Role |
| ----------- | ------------------- | ----------------- | ---------------- | -------- |
| **Roadmap** | `roadmap.md`        | **WHAT** to build | Design & Plan    | Document |
| **Scope**   | `scopes/{scope}.md` | **WHEN** to build | Define range     | Document |
| **Tasks**   | `tasks/{scope}.md`  | **HOW** to build  | Review & Approve | Generate |

### Roadmap (WHAT)

- Overall development direction
- Complete feature specification
- All planned items with priorities
- Feature dependencies
- **Human designs & plans**: Commander defines what to build
- **LLM documents**: LLM organizes and writes the roadmap document

### Scope (WHEN)

- Work range extracted from roadmap
- Time-based division (Q1, Q2, Phase1, etc.)
- Specific items to implement this period
- Success criteria for the scope
- **Human defines range**: Commander specifies which items to work on
- **LLM documents**: LLM organizes and writes the scope document

### Tasks (HOW)

- Detailed implementation plan for scope items
- Step-by-step execution order
- Parallel vs sequential task designation
- Verification methods for each task
- **LLM generates**: Autonomously divides tasks, determines order, groups parallel/sequential
- **CDD-referenced**: Consults CDD (Tier 1-2) for implementation patterns
- **Human approves**: Commander reviews and approves the generated tasks

## Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. [Human→LLM] Roadmap Design                                  │
│     Human designs & plans overall direction                     │
│     LLM organizes and documents roadmap.md                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. [Human→LLM] Scope Definition                                │
│     Human defines work range (which items, which period)        │
│     LLM organizes and documents scopes/{scope}.md               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. [LLM] Task Generation                                       │
│     LLM autonomously generates tasks/{scope}.md                 │
│     References CDD (Tier 1-2) for implementation patterns       │
│     Divides tasks, determines order, groups parallel/sequential │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  4. [Human] Task Review & Approval                              │
│     Commander reviews generated tasks                           │
│     Modifies if needed, then approves execution                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  5. [LLM] Execution (ADD Phase)                                 │
│     Coder LLM implements tasks following approved plan          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  6. [System] Completion & Archive                               │
│     Merge scope + tasks → history/scopes/{scope}.md             │
│     Update CDD if new patterns discovered                       │
└─────────────────────────────────────────────────────────────────┘
```

## Task Execution Modes

Tasks can be designated as parallel or sequential:

```yaml
# Example: tasks/{scope}.md structure
execution_order:
  - phase: 1
    mode: parallel
    tasks:
      - Setup database schema
      - Create API interfaces
      - Initialize frontend components

  - phase: 2
    mode: sequential
    tasks:
      - Implement authentication flow
      - Add authorization checks
      - Integrate with existing services

  - phase: 3
    mode: parallel
    tasks:
      - Write unit tests
      - Write integration tests
```

**Parallel**: Independent tasks that can be executed simultaneously by multiple agents
**Sequential**: Dependent tasks that must be executed in order

## Multi-Scope: Concurrent Work Support

Multiple developers can work on different scopes simultaneously:

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

benefits:
  - No Git conflicts
  - Same token count (2 files per person)
  - Independent progress
```

## Token Load Strategy

| Situation       | Load                                    | Skip                           |
| --------------- | --------------------------------------- | ------------------------------ |
| **Planning**    | `roadmap.md`                            | scopes, tasks, history         |
| **Work Start**  | `scopes/{scope}.md`, `tasks/{scope}.md` | roadmap, other scopes, history |
| **Continue**    | `tasks/{scope}.md`                      | Everything else                |
| **Review Done** | `history/scopes/{scope}.md`             | Active files                   |

## Scope Lifecycle

```yaml
create:
  trigger: 'Commander selects range from roadmap'
  action:
    - 'Create scopes/{scope}.md (work range)'
    - 'LLM generates tasks/{scope}.md (referencing CDD)'

active:
  work: 'LLM implements tasks per approved plan'
  update: 'Progress tracked in tasks/{scope}.md'

complete:
  trigger: 'All tasks done'
  action:
    - 'Merge scope + tasks → history/scopes/{date}-{descriptive-name}.md'
    - 'Delete active files (optional)'
    - 'Update CDD if patterns found'
```

### History File Naming Convention

Archive files should use descriptive names that indicate what was accomplished:

```
history/scopes/{YYYY-MM}-{descriptive-name}.md

Examples:
- 2026-01-mail-notification-services.md
- 2026-02-identity-platform-enhancements.md
- 2026-03-analytics-dashboard.md

history/decisions/{YYYY-MM-DD}-{decision-topic}.md

Examples:
- 2026-01-21-menu-structure-priority.md
- 2026-02-15-auth-provider-selection.md
```

**Why descriptive names?**

- Quick identification of what was done without opening the file
- Easy to search and reference later
- Clear timeline of project evolution

## File Templates

### roadmap.md (WHAT)

```markdown
# {App} Roadmap

> WHAT: Overall feature spec & direction | Load on planning only

## 2026

| Q   | Priority | Feature        | Status  | Scope               |
| --- | -------- | -------------- | ------- | ------------------- |
| Q1  | P0       | Menu structure | Active  | → scopes/2026-Q1.md |
| Q2  | P0       | Dashboard      | Pending | -                   |
| Q3  | P0       | Audit center   | Pending | -                   |

## Dependencies

Menu → Dashboard → Audit

## Feature Specs

- menu-structure.md
- dashboard.md
```

### scopes/{scope}.md (WHEN)

```markdown
# Scope: 2026-Q1

> WHEN: Work range from roadmap | Requires Human approval

## Target

Menu structure implementation

## Period

2026-01-01 ~ 2026-03-31

## Items (from Roadmap)

| Priority | Feature           | Status |
| -------- | ----------------- | ------ |
| P0       | Menu config       | ⏳     |
| P1       | Route setup       | ⏳     |
| P2       | Permission checks | ⏳     |

## Success Criteria

- All menu items functional
- Permission-based visibility
- 80% test coverage

## References

- Feature Spec: `menu-structure.md`
- Tasks: `tasks/2026-Q1.md`
```

### tasks/{scope}.md (HOW)

```markdown
# Tasks: 2026-Q1

> HOW: Detailed implementation plan | References CDD | LLM autonomous

## CDD References

- `.ai/apps/web-admin.md` - App patterns
- `docs/llm/guides/react-patterns.md` - React conventions

## Execution Plan

### Phase 1 (Parallel)

- [ ] Update menu.config.ts structure
- [ ] Create route definitions
- [ ] Setup permission constants

### Phase 2 (Sequential)

- [ ] Implement menu rendering logic
- [ ] Add permission checks
- [ ] Integrate breadcrumb navigation

### Phase 3 (Parallel)

- [ ] Write unit tests
- [ ] Write integration tests

## Verification

| Task        | Verification Command             |
| ----------- | -------------------------------- |
| Menu config | `pnpm test:unit menu.config`     |
| Routes      | `pnpm dev` → Navigate all routes |
| Tests       | `pnpm test:coverage` → 80%+      |

## Progress

### Completed

(none)

### Blocked

(none)
```

### history/scopes/{date}-{name}.md (DONE)

```markdown
# Completed: {Scope Title}

> **Archived**: YYYY-MM-DD | **Duration**: YYYY-MM ~ YYYY-MM

## Summary

Brief description of what was accomplished in this scope.

## Deliverables

| Deliverable | Path                  | Status |
| ----------- | --------------------- | ------ |
| service-a   | `services/service-a/` | ✅     |
| proto       | `packages/proto/...`  | ✅     |

## Key Decisions

- Decision 1: Why we chose X over Y
- Decision 2: Architecture pattern adopted

## CDD Updates

| File                     | Action  |
| ------------------------ | ------- |
| `.ai/services/xxx.md`    | Created |
| `docs/llm/guides/yyy.md` | Updated |

## Lessons Learned

- What went well
- What could be improved
- Patterns to reuse

## References

- Original scope: `scopes/{scope}.md` (archived)
- Original tasks: `tasks/{scope}.md` (archived)
```

## Learning Loop (Future Enhancement)

```
LLM generates plan
    ↓
Human reviews & modifies
    ↓
Diff extracted → Learning data
    ↓
Planning LLM improves over time
```

When Commander modifies LLM-generated plans, the diff becomes valuable training data for future fine-tuning.

## Best Practices

| Practice                 | Description                                    |
| ------------------------ | ---------------------------------------------- |
| Roadmap = Planning only  | Do not load during implementation              |
| Scope = 1 person 1 scope | Separate scopes for concurrent work            |
| Tasks = CDD reference    | Always consult CDD for implementation patterns |
| Tasks = Explicit modes   | Clearly mark parallel vs sequential tasks      |
| History = Archive only   | Skip during active work                        |

## References

- Methodology: `docs/llm/policies/development-methodology.md`
- CDD Policy: `docs/llm/policies/cdd.md`
