# Auth Service

> Admin & Operator authentication + MFA + Session + Legal + SCIM 2.0 + HR Backend (Phase 3) | Port: 3002 | DB: girok_auth

**Phase 3 Migration Applied**: HR Backend (Attendance & Leave Management) - 6 new tables, 30+ endpoints

| Owns                 | Delegates         |
| -------------------- | ----------------- |
| Admin Auth           | -                 |
| Operator Auth        | -                 |
| MFA (TOTP/Backup)    | -                 |
| Session Management   | -                 |
| Legal Documents      | -                 |
| Consent Tracking     | -                 |
| OAuth Config         | Phase 1           |
| Admin Profile        | Phase 2           |
| Admin Enterprise     | Phase 2           |
| NHI Management       | Phase 2           |
| **Attendance**       | **Phase 3 (NEW)** |
| **Leave Management** | **Phase 3 (NEW)** |

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

## Phase 3: HR Backend (Attendance & Leave)

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

**SSOT**: `docs/llm/services/auth-service.md`
