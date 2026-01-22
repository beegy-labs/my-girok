# Auth Service REST API Reference

> Comprehensive REST API documentation for auth-service with 150+ endpoints.

## Overview

The auth-service provides REST APIs for authentication, session management, admin profiles, organization management, attendance, leave management, delegation, compliance, and global mobility.

---

## Authentication & Session Management

| Endpoint          | Method | Access        | Description               |
| ----------------- | ------ | ------------- | ------------------------- |
| `/auth/login`     | POST   | Public        | Admin login (step 1)      |
| `/auth/login/mfa` | POST   | Public        | MFA verification (step 2) |
| `/auth/refresh`   | POST   | Authenticated | Refresh session token     |
| `/auth/logout`    | POST   | Authenticated | Invalidate session        |
| `/auth/session`   | GET    | Authenticated | Get session details       |

---

## OAuth Configuration

| Endpoint                         | Method | Access | Description                                         |
| -------------------------------- | ------ | ------ | --------------------------------------------------- |
| `/oauth-config`                  | GET    | MASTER | List all OAuth providers (masked secrets)           |
| `/oauth-config/enabled`          | GET    | Public | List enabled providers (for UI)                     |
| `/oauth-config/:provider`        | PATCH  | MASTER | Update provider credentials (AES-256-GCM encrypted) |
| `/oauth-config/:provider/toggle` | PATCH  | MASTER | Enable/disable provider                             |
| `/oauth-config/:provider/status` | GET    | Public | Check if provider enabled                           |

---

## Admin Profile (21 endpoints)

Manage admin user profiles with support for 83 profile fields.

| Endpoint                      | Method | Description                     |
| ----------------------------- | ------ | ------------------------------- |
| `/admin/profile/me`           | GET    | Get own profile (all 83 fields) |
| `/admin/profile/:id`          | GET    | Get admin profile by ID         |
| `/admin/profile/:id`          | PATCH  | Bulk update multiple sections   |
| `/admin/profile/:id/scim`     | PATCH  | Update SCIM attributes          |
| `/admin/profile/:id/employee` | PATCH  | Update employee info            |
| `/admin/profile/:id/job`      | PATCH  | Update job/org details          |
| `/admin/profile/:id/partner`  | PATCH  | Update partner info             |
| `/admin/profile/:id/joiner`   | PATCH  | Update joiner attributes        |
| `/admin/profile/:id/mover`    | PATCH  | Update mover attributes         |
| `/admin/profile/:id/leaver`   | PATCH  | Update leaver attributes        |
| `/admin/profile/:id/contact`  | PATCH  | Update contact info             |

---

## Admin Enterprise (11 endpoints)

Enterprise-level admin management including Non-Human Identities (NHI).

| Endpoint                                      | Method | Description                    |
| --------------------------------------------- | ------ | ------------------------------ |
| `/admin/enterprise/list`                      | GET    | List/search admins (paginated) |
| `/admin/enterprise/nhi`                       | POST   | Create Non-Human Identity      |
| `/admin/enterprise/:id/nhi`                   | PATCH  | Update NHI attributes          |
| `/admin/enterprise/:id/nhi/rotate`            | POST   | Rotate NHI credentials         |
| `/admin/enterprise/:id/location/physical`     | PATCH  | Update physical location       |
| `/admin/enterprise/:id/location/tax-legal`    | PATCH  | Update tax/legal location      |
| `/admin/enterprise/:id/access-control`        | PATCH  | Update security clearance      |
| `/admin/enterprise/:id/identity-verification` | PATCH  | Update verification status     |
| `/admin/enterprise/:id/verify`                | POST   | Perform identity verification  |
| `/admin/enterprise/:id/extensions`            | PATCH  | Update JSONB extensions        |
| `/admin/enterprise/:id`                       | PATCH  | Bulk update enterprise         |

---

## Organization Management (41 endpoints)

### Entity Types

| Entity              | Endpoints | Key Features               |
| ------------------- | --------- | -------------------------- |
| **Job Grade**       | 6         | Code uniqueness, JobFamily |
| **Org Unit**        | 7         | Hierarchical tree          |
| **Legal Entity**    | 5         | Country filter             |
| **Office**          | 6         | Legal entity validation    |
| **Building**        | 6         | Office validation          |
| **Floor**           | 5         | Floor number sort          |
| **Partner Company** | 6         | PartnerType filter         |

---

## Attendance Management (8 endpoints)

| Endpoint                           | Method | Description                |
| ---------------------------------- | ------ | -------------------------- |
| `/attendance/clock-in`             | POST   | Clock in                   |
| `/attendance/clock-out`            | POST   | Clock out                  |
| `/attendance/me`                   | GET    | Get own attendance         |
| `/attendance/me/stats`             | GET    | Get attendance stats       |
| `/attendance/:id/approve-overtime` | PATCH  | Approve overtime (manager) |
| `/work-schedules`                  | POST   | Create work schedule       |
| `/work-schedules/me`               | GET    | Get own schedules          |
| `/work-schedules/me/active`        | GET    | Get active schedule        |

---

## Leave Management (13 endpoints)

| Endpoint                                     | Method | Description              |
| -------------------------------------------- | ------ | ------------------------ |
| `/leaves`                                    | POST   | Create leave request     |
| `/leaves/:id/submit`                         | POST   | Submit for approval      |
| `/leaves/:id/approve`                        | POST   | Approve/reject (manager) |
| `/leaves/:id/cancel`                         | POST   | Cancel leave             |
| `/leaves/me`                                 | GET    | Get own leave requests   |
| `/leaves/pending-approvals`                  | GET    | Pending approvals        |
| `/leave-balances`                            | POST   | Create balance (HR)      |
| `/leave-balances/me`                         | GET    | Get own balance          |
| `/leave-balances/me/:year`                   | GET    | Get balance by year      |
| `/leave-balances/:adminId/:year`             | GET    | Get admin balance        |
| `/leave-balances/:adminId/:year/adjust`      | PATCH  | Adjust balance (HR)      |
| `/leave-balances/:adminId/:year/recalculate` | POST   | Recalculate balances     |
| `/leave-balances/:adminId/:year/initialize`  | POST   | Initialize for new year  |

---

## Delegation Management (9 endpoints)

| Endpoint                    | Method | Description            |
| --------------------------- | ------ | ---------------------- |
| `/delegations`              | POST   | Create delegation      |
| `/delegations`              | GET    | List delegations       |
| `/delegations/me/delegated` | GET    | Delegations I created  |
| `/delegations/me/received`  | GET    | Delegations I received |
| `/delegations/:id`          | GET    | Get by ID              |
| `/delegations/:id`          | PATCH  | Update delegation      |
| `/delegations/:id/approve`  | POST   | Approve/reject         |
| `/delegations/:id/revoke`   | POST   | Revoke delegation      |
| `/delegations/:id/logs`     | GET    | Get usage logs         |

**Features:** Overlap detection, auto-expiry, action limits, time/IP constraints

---

## Compliance Management (18 endpoints)

| Entity             | Operations                                  | Key Features           |
| ------------------ | ------------------------------------------- | ---------------------- |
| **Attestations**   | POST, GET, GET/:id, complete, waive         | Recurrence, signatures |
| **Certifications** | POST, GET, GET/:id, verify, renew           | Verification workflow  |
| **Training**       | POST, GET, GET/:id, start, complete, assign | Scoring, certificates  |

---

## Global Mobility (17 endpoints)

| Entity          | Operations                               | Key Features            |
| --------------- | ---------------------------------------- | ----------------------- |
| **Assignments** | CRUD + approve/start/complete/cancel (9) | Lifecycle, compensation |
| **Work Auth**   | CRUD + expiring/renew/expire (8)         | Expiry alerts (90 days) |

---

## Country Configuration (3 endpoints)

| Endpoint                        | Method | Description                 |
| ------------------------------- | ------ | --------------------------- |
| `/country-configs`              | GET    | List all (12 pre-populated) |
| `/country-configs/:countryCode` | GET    | Get config                  |
| `/country-configs/:countryCode` | PATCH  | Update config               |

**Supported Countries:** US, UK, CA, AU, DE, FR, JP, KR, SG, IN, CN, BR

---

## Employee Self-Service (17 endpoints)

| Module         | Endpoints                              | Restrictions        |
| -------------- | -------------------------------------- | ------------------- |
| **Profile**    | GET/PATCH /employee/profile/me         | Limited fields only |
| **Attendance** | clock-in, clock-out, me, stats         | Own data only       |
| **Leave**      | requests CRUD, submit, cancel, balance | Own data only       |
| **Delegation** | received, received/:id                 | Read-only           |

**Security:** EmployeeAuthGuard enforces that JWT `sub` claim matches employee ID

---

## Related Documentation

- Main: `auth-service.md`
- Database: `auth-service-database.md`
- Implementation: `auth-service-impl.md`

---

_This document is auto-generated from `docs/llm/services/auth-service-api.md`_
