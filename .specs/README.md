# Specifications (SDD)

> Task planning and tracking | **Last Updated**: 2026-01-22

**Policy**: `docs/llm/policies/sdd.md`

## Structure

```
.specs/
├── README.md
└── apps/{app}/
    ├── {feature}.md              # Spec (What to build)
    │
    ├── roadmap.md                # L1: Master roadmap
    │
    ├── scopes/                   # L2: Active scopes
    │   └── {year}-{period}.md   # e.g., 2026-Q1.md
    │
    ├── tasks/                    # L3: Scope tasks
    │   └── {year}-{period}.md   # e.g., 2026-Q1.md
    │
    └── history/
        ├── scopes/               # Completed scope archives
        └── decisions/            # Roadmap decisions
```

## 3-Layer Work

| Layer | File                | Human Role             |
| ----- | ------------------- | ---------------------- |
| L1    | `roadmap.md`        | **Direction** (Master) |
| L2    | `scopes/{scope}.md` | **Approve**            |
| L3    | `tasks/{scope}.md`  | Monitor                |

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

| App       | Scope                                       | Status    |
| --------- | ------------------------------------------- | --------- |
| web-admin | [2026-Q1](apps/web-admin/scopes/2026-Q1.md) | ⏳ Active |
