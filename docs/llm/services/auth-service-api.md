# auth-service REST API

> REST API endpoints for auth-service (150+ endpoints)

## Auth & Session

| Endpoint          | Method | Access        | Purpose                   |
| ----------------- | ------ | ------------- | ------------------------- |
| `/auth/login`     | POST   | Public        | Admin login (step 1)      |
| `/auth/login/mfa` | POST   | Public        | MFA verification (step 2) |
| `/auth/refresh`   | POST   | Authenticated | Refresh session token     |
| `/auth/logout`    | POST   | Authenticated | Invalidate session        |
| `/auth/session`   | GET    | Authenticated | Get session details       |

## OAuth Configuration

| Endpoint                         | Method | Access | Purpose                                             |
| -------------------------------- | ------ | ------ | --------------------------------------------------- |
| `/oauth-config`                  | GET    | MASTER | List all OAuth providers (masked secrets)           |
| `/oauth-config/enabled`          | GET    | Public | List enabled providers (for UI)                     |
| `/oauth-config/:provider`        | PATCH  | MASTER | Update provider credentials (AES-256-GCM encrypted) |
| `/oauth-config/:provider/toggle` | PATCH  | MASTER | Enable/disable provider                             |
| `/oauth-config/:provider/status` | GET    | Public | Check if provider enabled                           |

## Admin Profile (21 endpoints)

| Endpoint                      | Method | Purpose                         |
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

## Admin Enterprise (11 endpoints)

| Endpoint                                      | Method | Purpose                        |
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

## Organization (41 endpoints)

| Entity              | Endpoints                  | Key Features               |
| ------------------- | -------------------------- | -------------------------- |
| **Job Grade**       | CRUD + code lookup (6)     | Code uniqueness, JobFamily |
| **Org Unit**        | CRUD + tree + children (7) | Hierarchical tree          |
| **Legal Entity**    | CRUD (5)                   | Country filter             |
| **Office**          | CRUD + buildings (6)       | Legal entity validation    |
| **Building**        | CRUD + floors (6)          | Office validation          |
| **Floor**           | CRUD (5)                   | Floor number sort          |
| **Partner Company** | CRUD + agreements (6)      | PartnerType filter         |

## Attendance (8 endpoints)

| Endpoint                           | Method | Purpose                    |
| ---------------------------------- | ------ | -------------------------- |
| `/attendance/clock-in`             | POST   | Clock in                   |
| `/attendance/clock-out`            | POST   | Clock out                  |
| `/attendance/me`                   | GET    | Get own attendance         |
| `/attendance/me/stats`             | GET    | Get attendance stats       |
| `/attendance/:id/approve-overtime` | PATCH  | Approve overtime (manager) |
| `/work-schedules`                  | POST   | Create work schedule       |
| `/work-schedules/me`               | GET    | Get own schedules          |
| `/work-schedules/me/active`        | GET    | Get active schedule        |

## Leave (13 endpoints)

| Endpoint                                     | Method | Purpose                  |
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

## Delegation (9 endpoints)

| Endpoint                    | Method | Purpose                |
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

**Features**: Overlap detection, auto-expiry, action limits, time/IP constraints

## Compliance (18 endpoints)

| Entity             | Endpoints                                   | Key Features           |
| ------------------ | ------------------------------------------- | ---------------------- |
| **Attestations**   | POST, GET, GET/:id, complete, waive         | Recurrence, signatures |
| **Certifications** | POST, GET, GET/:id, verify, renew           | Verification workflow  |
| **Training**       | POST, GET, GET/:id, start, complete, assign | Scoring, certificates  |

## Global Mobility (17 endpoints)

| Entity          | Endpoints                                | Key Features            |
| --------------- | ---------------------------------------- | ----------------------- |
| **Assignments** | CRUD + approve/start/complete/cancel (9) | Lifecycle, compensation |
| **Work Auth**   | CRUD + expiring/renew/expire (8)         | Expiry alerts (90 days) |

## Country Config (3 endpoints)

| Endpoint                        | Method | Purpose                     |
| ------------------------------- | ------ | --------------------------- |
| `/country-configs`              | GET    | List all (12 pre-populated) |
| `/country-configs/:countryCode` | GET    | Get config                  |
| `/country-configs/:countryCode` | PATCH  | Update config               |

**Countries**: US, UK, CA, AU, DE, FR, JP, KR, SG, IN, CN, BR

## Employee Self-Service (17 endpoints)

| Module         | Endpoints                              | Restrictions        |
| -------------- | -------------------------------------- | ------------------- |
| **Profile**    | GET/PATCH /employee/profile/me         | Limited fields only |
| **Attendance** | clock-in, clock-out, me, stats         | Own data only       |
| **Leave**      | requests CRUD, submit, cancel, balance | Own data only       |
| **Delegation** | received, received/:id                 | Read-only           |

**Security**: EmployeeAuthGuard enforces JWT `sub` = employee ID

---

_Related: `auth-service.md` | `auth-service-database.md` | `auth-service-impl.md`_
