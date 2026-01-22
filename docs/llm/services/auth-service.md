# auth-service

```yaml
port: 3002
grpc: 50052
db: girok_auth (PostgreSQL)
cache: Valkey DB 2
events: auth.* (Redpanda)
codebase: services/auth-service/
```

## Core Concepts

| Concept                | Description                                                 |
| ---------------------- | ----------------------------------------------------------- |
| **Admin Auth**         | Login, bcrypt hashing, MFA (TOTP), JWT sessions             |
| **Session Management** | Issue/validate/revoke sessions, support "revoke all"        |
| **Legal Consent**      | Track admin consent for ToS, Privacy Policy                 |
| **SCIM 2.0**           | `admins` table compatible with SCIM Core/Enterprise schemas |
| **JML**                | Joiner-Mover-Leaver lifecycle tracking                      |
| **NHI**                | Non-Human Identity (service accounts, API clients)          |

## Key Tables Overview

| Table                | Purpose                    |
| -------------------- | -------------------------- |
| `admins`             | Admin accounts (83 fields) |
| `admin_sessions`     | Session management         |
| `admin_attendances`  | Clock in/out records       |
| `admin_leaves`       | Leave requests             |
| `admin_delegations`  | Authority delegation       |
| `admin_attestations` | Compliance attestations    |
| `global_assignments` | International assignments  |
| `country_configs`    | Country HR policies        |
| `job_grade`          | Job levels/tracks          |
| `organization_unit`  | Org hierarchy (tree)       |

## gRPC Methods

```yaml
proto: packages/proto/auth/v1/auth.proto
methods:
  - AdminLogin: Step 1
  - AdminLoginMfa: Step 2
  - AdminValidateSession: Validate token
  - AdminRefreshSession: Refresh expired
  - AdminLogout: Invalidate
```

## Events (Outbox Pattern)

| Event                     | Trigger               | Payload                     |
| ------------------------- | --------------------- | --------------------------- |
| `admin.created`           | New admin account     | ID, email, name, scope      |
| `admin.updated`           | Profile updated       | ID, updated fields          |
| `admin.terminated`        | Employment terminated | ID, terminationDate, reason |
| `nhi.created`             | New NHI created       | ID, ownerID, purpose, type  |
| `nhi.credentials.rotated` | Credentials rotated   | ID, rotatedAt               |

## Security

### NHI Security

- Cannot create with HUMAN identity type
- Credential rotation interval (default: 90 days)
- Must have human owner (ownerAdminId required)

### Access Control

- AdminAuthGuard on all endpoints
- EmployeeAuthGuard for self-service (JWT sub claim)
- Security clearance enforcement at app level
- IP range restrictions (allowedIpRanges)
- Access end dates (accessEndDate)

### OAuth Configuration

- Client secrets encrypted (AES-256-GCM)
- Callback URL whitelist (localhost, girok.dev, auth.girok.dev, auth-bff.girok.dev)
- Audit logging for credential changes

## Version History

```yaml
version: Phase 5 (2026-01-18)
last_updated: Employee Self-Service APIs
phases:
  phase0: Backup HR service structure
  phase1: HR cleanup & schema design
  phase2: Enterprise identity (SCIM, JML, NHI) - 83 fields
  phase3: Attendance & leave management - 6 tables, 129 tests
  phase4: Delegation, compliance, global mobility - 15 tables, 77 tests
  phase5: Employee self-service - 17 endpoints, 30 tests
total_endpoints: 150+
total_tests: 1359+
total_tables: 24
total_enums: 30+
```

## Related Documents

| Topic          | Document                       |
| -------------- | ------------------------------ |
| Database       | `auth-service-database.md`     |
| API Endpoints  | `auth-service-api.md`          |
| Implementation | `auth-service-impl.md`         |
| Quick Ref      | `.ai/services/auth-service.md` |

---

_SSOT for auth-service. Split into focused documents for RAG optimization._
