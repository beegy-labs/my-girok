# Web-Admin Roadmap

> **WHAT**: Overall feature spec & direction | Load on planning only

## Project Vision

Enterprise-grade Identity & Access Management admin console targeting Fortune 500 companies with competitive parity against Microsoft Entra and Okta.

## Feature Specification

### Primary Spec: Menu Structure (v1.0)

**File**: [`menu-structure.md`](menu-structure.md)
**Status**: FINAL (97/100)
**Review Date**: 2026-01-21

| Metric              | Value                                           |
| ------------------- | ----------------------------------------------- |
| L1 Menu Count       | 9                                               |
| Identity Categories | 4 (People, Workloads, Provisioning, Lifecycle)  |
| Access Sub-menus    | 5 (Roles, Policies, Reviews, Entitlements, PAM) |
| Total URLs          | ~230                                            |
| User Personas       | 6 defined                                       |
| User Journeys       | 12 (all ≤3 clicks)                              |
| Competitive Parity  | Entra 98%, Okta 98%                             |

### L1 Menu Overview

```
1. Dashboard          → Overview, Pending Approvals, Quick Actions
2. Organization       → OU, Subsidiaries, Regions, Delegation
3. Applications       → App List, App Catalog, Create
4. Identity           → People, Workloads, Provisioning, Lifecycle
5. Access             → Roles, Policies, Reviews, PAM/JIT
6. Security           → Sessions, Threats, Conditional Access, Network
7. Governance         → Approvals, SoD, Audit Readiness, Evidence
8. Audit Center       → Unified Logs, Reports, Retention, Auditor Portal
9. Compliance         → Data Residency, Privacy/DSAR, Certifications

⚙️ Settings (Bottom-pinned)
   → General, Billing, Integrations, Developer Hub, Service Health
```

### Unique Differentiators

| Feature                 | Competitors | Our Value                                   |
| ----------------------- | ----------- | ------------------------------------------- |
| GitOps Configuration    | ❌          | ✅ L1 + L2 (Infrastructure as Code for IAM) |
| Compliance as L1 Menu   | ❌          | ✅ Regulatory-first design                  |
| 3-Level Admin Hierarchy | Partial     | ✅ Clear delegation model                   |

## Implementation Scopes

### 2026 Phase 1: Foundation

| Scope | Priority | Feature           | Status           | Scope File                |
| ----- | -------- | ----------------- | ---------------- | ------------------------- |
| 1     | P0       | Email Service     | ✅ Spec Complete | → `scopes/2026-scope1.md` |
| 2     | P0       | Login             | 📋 Planning      | -                         |
| 3     | P0       | Roles             | 📋 Planning      | -                         |
| 4     | P0       | Admin Accounts    | 📋 Planning      | -                         |
| 5     | P1       | Partners          | Pending          | -                         |
| 6     | P2       | Identity Overview | Pending          | -                         |

### Dependencies

```
Scope 1: Email Service (Foundation)
    ↓
Scope 2: Login (Password Reset → Email)
    ↓
Scope 3: Roles (RBAC Foundation)
    ↓
Scope 4: Admin Accounts (Invite → Email, Role → Roles)
    ↓
Scope 5: Partners (Invite → Email, Access → Roles)
    ↓
Scope 6: Identity Overview (Dashboard)
```

### 2026 Phase 2+ (Future)

| Category     | Features                                           |
| ------------ | -------------------------------------------------- |
| Security     | Sessions, MFA, Password Policy, Conditional Access |
| Organization | OU Hierarchy, Subsidiaries, Delegation             |
| Governance   | Approvals, SoD Rules, Audit Readiness              |
| Audit        | Unified Logs, Reports, Auditor Portal              |
| Compliance   | Data Residency, DSAR, Certifications               |
| Advanced     | PAM/JIT, Lifecycle Workflows, Command Palette      |

## Status Legend

| Status           | Description                        |
| ---------------- | ---------------------------------- |
| Pending          | Waiting                            |
| 📋 Planning      | Spec in progress                   |
| ✅ Spec Complete | Spec done, awaiting implementation |
| 🚧 In Progress   | Implementation in progress         |
| ✅ Done          | Implementation complete            |

## References

- **Feature Spec**: `menu-structure.md` (v1.0, 97/100)
- **Active Scopes**: `scopes/`
- **Completed**: `history/scopes/`
- **Decisions**: `history/decisions/`
