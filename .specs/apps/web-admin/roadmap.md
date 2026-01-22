# Web-Admin Roadmap

> L1: Master direction | Load on planning only

## Feature Spec

- `menu-structure.md` (v1.0, 97/100)

## 2026

| Scope | Priority | Feature           | Status           | Scope File                |
| ----- | -------- | ----------------- | ---------------- | ------------------------- |
| 1     | P0       | Email Service     | ✅ Spec Complete | → `scopes/2026-scope1.md` |
| 2     | P0       | Login             | 📋 Planning      | -                         |
| 3     | P0       | Roles             | 📋 Planning      | -                         |
| 4     | P0       | Admin Accounts    | 📋 Planning      | -                         |
| 5     | P1       | Partners          | Pending          | -                         |
| 6     | P2       | Identity Overview | Pending          | -                         |

## Status Legend

| Status           | Description                |
| ---------------- | -------------------------- |
| Pending          | Waiting                    |
| 📋 Planning      | Spec in progress           |
| ✅ Spec Complete | Spec done, awaiting impl   |
| 🚧 In Progress   | Implementation in progress |
| ✅ Done          | Implementation complete    |

## Dependencies

```
Scope 1: Email Service
    ↓
Scope 2: Login (Password Reset → Email)
    ↓
Scope 3: Roles
    ↓
Scope 4: Admin Accounts (Invite → Email, Role Assign → Roles)
    ↓
Scope 5: Partners (Invite → Email, Access → Roles)
    ↓
Scope 6: Identity Overview
```

## Phase 2+ (Future)

- Security (Sessions, MFA, Password Policy)
- Organization & Governance
- Audit & Compliance
- Advanced Features (PAM, Lifecycle, Command Palette)

## Completed

See `history/scopes/` for archived scopes.
