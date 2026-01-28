# my-girok Solution Roadmap

> L1: Master direction | Load on planning only

## 2026

| Phase | Period  | Priority | Feature             | Status    | Scope                             |
| ----- | ------- | -------- | ------------------- | --------- | --------------------------------- |
| 1-A   | 2026-Q1 | P0       | Authentication      | ⏳ Active | → `scopes/2026-Q1-phase1-auth.md` |
| 1-B   | 2026-Q1 | P0       | Core Features       | Pending   | → `scopes/2026-Q1-phase2-core.md` |
| 2     | 2026-Q2 | P0       | Feature Enhancement | Pending   | -                                 |
| 3     | 2026-Q3 | P1       | Mobile App          | Pending   | -                                 |
| 4     | 2026-Q4 | P1       | Enterprise Features | Pending   | -                                 |

## Phase 1-A: Authentication (2026-Q1 - Week 1-2)

### Goals

1. Register my-girok service in Identity Platform
2. Enable user registration and login
3. Enable admin management via web-admin

### Success Criteria

- [ ] Users can register (LOCAL + OAuth)
- [ ] Users can login/logout
- [ ] JWT includes services array
- [ ] Domain-based service detection works
- [ ] Admin can manage my-girok in web-admin

### Scope

→ `scopes/2026-Q1-phase1-auth.md`

## Phase 1-B: Core Features (2026-Q1 - Week 3-4)

### Goals

1. Restore Resume CRUD operations
2. Enable file uploads (MinIO)
3. Restore PDF export and public sharing

### Success Criteria

- [ ] Resume CRUD operations functional
- [ ] File upload working (profile image, certificates)
- [ ] PDF export working (A4, Letter)
- [ ] Public sharing enabled

### Scope

→ `scopes/2026-Q1-phase2-core.md`

### Blockers

- Phase 1-A must complete first

## Phase 2: Feature Enhancement (2026-Q2)

### Planned Features

- Advanced resume templates
- AI-powered content suggestions
- Cover letter generation
- Resume analytics

## Phase 3: Mobile App (2026-Q3)

### Platforms

- iOS (Swift)
- Android (Kotlin)

## Phase 4: Enterprise Features (2026-Q4)

### Planned Features

- Team accounts
- Bulk operations
- Advanced analytics
- Custom branding

## Dependencies

```
Phase 1 (Recovery)
    ↓
Phase 2 (Enhancement) + Phase 3 (Mobile)
    ↓
Phase 4 (Enterprise)
```

## Completed

See `history/scopes/` for archived scopes.

## References

- Solution Spec: `docs/llm/solutions/my-girok.md`
- Active Scopes: `scopes/`
- Decisions: `history/decisions/`
