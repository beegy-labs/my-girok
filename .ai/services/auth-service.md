# Auth Service

> Admin & Operator authentication + MFA + Session + Legal + SCIM 2.0 + HR Backend (Phase 3-4) | Port: 3002 | DB: girok_auth

**Phase 4 Migration Applied**: Advanced Features (Delegation, Compliance, Global Mobility) - 15 new tables, 45+ endpoints

| Owns                     | Delegates         |
| ------------------------ | ----------------- |
| Admin Auth               | -                 |
| Operator Auth            | -                 |
| MFA (TOTP/Backup)        | -                 |
| Session Management       | -                 |
| Legal Documents          | -                 |
| Consent Tracking         | -                 |
| OAuth Config             | Phase 1           |
| Admin Profile            | Phase 2           |
| Admin Enterprise         | Phase 2           |
| NHI Management           | Phase 2           |
| Attendance               | Phase 3           |
| Leave Management         | Phase 3           |
| **Delegation**           | **Phase 4 (NEW)** |
| **Compliance**           | **Phase 4 (NEW)** |
| **Global Mobility**      | **Phase 4 (NEW)** |
| **Country Config**       | **Phase 4 (NEW)** |
| **Organization History** | **Phase 4 (NEW)** |

## Phase 2: Enterprise Admin Management

### Profile Management

- SCIM 2.0 Core attributes (username, displayName, givenName, etc.)
- Employee Info (employeeNumber, employeeType, employmentStatus)
- Job & Organization (jobTitle, jobGrade, organizationUnit, manager)
- Partner/Contractor info
- JML Lifecycle (Joiner-Mover-Leaver: hire, promotion, termination dates)
- Contact information (phone, mobile, emergency contact)

### Enterprise Features

- NHI (Non-Human Identity) creation & management
- Service account lifecycle (credential rotation, expiry)
- Physical & Tax/Legal location tracking
- Access control (security clearance, data access level, IP restrictions)
- Identity verification (KYC/AML levels)
- JSONB extensions (skills, certifications, education, work history)

### API Endpoints

**OAuth Configuration:**

- `GET /oauth-config` - List all providers (MASTER)
- `GET /oauth-config/enabled` - Get enabled providers (PUBLIC)
- `PATCH /oauth-config/:provider` - Update credentials (MASTER)
- `PATCH /oauth-config/:provider/toggle` - Enable/disable (MASTER)

**Admin Profile:**

- `GET /admin/profile/me` - Get own profile
- `GET /admin/profile/:id` - Get admin profile
- `PATCH /admin/profile/:id/scim` - Update SCIM Core
- `PATCH /admin/profile/:id/employee` - Update employee info
- `PATCH /admin/profile/:id/job` - Update job & organization
- `PATCH /admin/profile/:id/joiner` - Update joiner info
- `PATCH /admin/profile/:id/leaver` - Update leaver info

**Enterprise:**

- `POST /admin/enterprise/nhi` - Create NHI
- `POST /admin/enterprise/:id/nhi/rotate` - Rotate NHI credentials
- `POST /admin/enterprise/:id/verify` - Verify identity
- `GET /admin/enterprise/list` - List admins with filters

## Phase 3: Admin Account Management

### System Admin Management

- CRUD operations for admin accounts with role-based access
- Admin invitation system (email/direct)
- Role assignment and permission management
- Scope-based access (SYSTEM/TENANT)
- Audit logging for all admin operations

### Key Endpoints

**Admin Accounts:** `POST /admin/admins`, `GET /admin/admins`, `GET /admin/admins/:id`, `PATCH /admin/admins/:id`, `DELETE /admin/admins/:id`, `POST /admin/admins/:id/reactivate`

**Roles:** `GET /admin/admins/roles`, `PATCH /admin/admins/:id/role`

**Invitations:** `POST /admin/admins/invite`

**Permissions:** `system_admin:create`, `system_admin:read`, `system_admin:update`, `system_admin:delete`

## HR Backend (Attendance & Leave)

**Note**: HR code will be removed in Phase 10 and migrated to a separate hr-service.

### Attendance Management

- Clock-in/out tracking with IP/location logging
- Overtime request & approval workflow
- Work schedule management (STANDARD/SHIFT/FLEXIBLE)
- Attendance statistics & reporting (present, late, absent, remote)

### Leave Management

- Multi-level approval workflow (first → second → final)
- Leave balance tracking with carryover (max 5 days)
- Tenure bonus calculation (3/5/10 years)
- Leave types: ANNUAL, SICK, PARENTAL, UNPAID, COMPENSATORY, STUDY, BEREAVEMENT

### Key Endpoints

**Attendance:** `POST /attendance/clock-in`, `POST /attendance/clock-out`, `GET /attendance/me/stats`, `PATCH /attendance/:id/approve-overtime`

**Leave:** `POST /leaves`, `POST /leaves/:id/submit`, `POST /leaves/:id/approve`, `GET /leaves/pending-approvals`

**Balance:** `GET /leave-balances/me`, `PATCH /leave-balances/:adminId/:year/adjust`, `POST /leave-balances/:adminId/:year/recalculate`

## Phase 4: Advanced Features (Delegation, Compliance, Global Mobility)

### Delegation Management

- Authority delegation with approval workflow
- Delegation logs for audit trail
- Constraints: allowed hours, IPs, max actions
- Auto-expiry and reminder notifications

### Compliance Management

- **Attestations**: Code of conduct, security policies, mandatory acknowledgments
- **Certifications**: Professional credentials with verification
- **Training**: Assignment, completion tracking, scoring, recurrence

### Global Mobility

- **Assignments**: International/domestic assignments with compensation tracking
- **Work Authorizations**: Visas, work permits, residency with expiry alerts

### Country Configuration

- Country-specific HR policies (12 countries pre-populated)
- Work hours, leave policies, holidays, tax years per country
- Read-heavy service for global workforce management

### Organization History

- Track promotions, transfers, role changes
- Approval workflow for organizational changes
- Compensation and effective date tracking

### Key Endpoints

**Delegation:** `POST /delegations`, `POST /delegations/:id/approve`, `POST /delegations/:id/revoke`, `GET /delegations/:id/logs`

**Compliance:** `POST /compliance/attestations`, `POST /compliance/certifications`, `POST /compliance/training`, `PATCH /compliance/training/:id/complete`

**Global Mobility:** `POST /global-mobility/assignments`, `POST /global-mobility/work-authorizations`, `GET /global-mobility/work-authorizations/expiring`

**Country Config:** `GET /country-configs`, `GET /country-configs/:code`

**Org History:** `POST /organization-history`, `POST /organization-history/:id/approve`

**SSOT**: `docs/llm/services/auth-service.md`
