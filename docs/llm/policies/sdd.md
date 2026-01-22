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
    ├── roadmap.md                # L1: Master roadmap (전체 방향)
    │                             # - Planning 세션에서만 로드
    │
    ├── scopes/                   # L2: Active scopes (동시 작업 지원)
    │   ├── 2026-Q1.md           # Scope A (Person A)
    │   └── 2026-Q2.md           # Scope B (Person B)
    │
    ├── tasks/                    # L3: Scope별 tasks
    │   ├── 2026-Q1.md           # Tasks for Scope A
    │   └── 2026-Q2.md           # Tasks for Scope B
    │
    └── history/
        ├── scopes/               # 완료된 scope 아카이브
        │   └── 2025-Q4.md       # Scope + tasks 통합 기록
        │
        └── decisions/            # 로드맵 결정 기록
            └── {date}-{decision}.md
```

## 3-Layer Work Structure

| Layer          | File                | Owner     | Human Role         |
| -------------- | ------------------- | --------- | ------------------ |
| **L1 Roadmap** | `roadmap.md`        | Human     | Direction (Master) |
| **L2 Scope**   | `scopes/{scope}.md` | Human+LLM | **Approval**       |
| **L3 Tasks**   | `tasks/{scope}.md`  | LLM       | Autonomous         |

## File Roles (Token Optimization)

| File                 | Content               | Token Strategy           |
| -------------------- | --------------------- | ------------------------ |
| `roadmap.md`         | Master roadmap (전체) | **Planning 시에만** 로드 |
| `scopes/{scope}.md`  | 현재 작업 범위        | 작업 시작 시 로드        |
| `tasks/{scope}.md`   | 상세 작업             | 작업 중 항상 로드        |
| `history/scopes/`    | 완료된 scope          | **작업 중 스킵**         |
| `history/decisions/` | 결정 기록             | 필요 시만 로드           |

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
  - 'Git 충돌 없음'
  - '토큰 수 동일 (2파일)'
  - '독립적 진행'
```

## Token Load Strategy

| Situation     | Load                                    | Skip                                  |
| ------------- | --------------------------------------- | ------------------------------------- |
| **계획 수립** | `roadmap.md`                            | `scopes/*`, `tasks/*`, `history/*`    |
| **작업 시작** | `scopes/{scope}.md`, `tasks/{scope}.md` | `roadmap.md`, 다른 scope, `history/*` |
| **작업 계속** | `tasks/{scope}.md`                      | 나머지 전부                           |
| **완료 검토** | `history/scopes/{scope}.md`             | 활성 파일                             |

## Scope ID Format

```
{year}-{period}
```

| Component | Description | Example              |
| --------- | ----------- | -------------------- |
| year      | 연도        | `2026`               |
| period    | 분기/단위   | `Q1`, `Q2`, `Phase1` |
| Full ID   | Combined    | `2026-Q1`            |

## Workflow

```
L1: roadmap.md (Master direction)
    ↓ Architect가 범위 선택
L2: scopes/{scope}.md (Human approval)
    ↓ LLM이 상세화
L3: tasks/{scope}.md (LLM execution)
    ↓ 완료
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

| Practice                 | Description                     |
| ------------------------ | ------------------------------- |
| Roadmap = Planning only  | 작업 시 로드하지 않음           |
| Scope = 1 person 1 scope | 동시 작업 시 scope 분리         |
| Tasks = Focused          | 현재 scope 작업만 포함          |
| History = Archive only   | 완료 후 통합 저장, 작업 중 스킵 |
| Naming = Consistent      | `{year}-{period}` 형식 준수     |

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
- CDD Structure: `docs/llm/policies/documentation-architecture.md`
- Industry Best Practices: Thoughtworks SDD, Addy Osmani Workflow
