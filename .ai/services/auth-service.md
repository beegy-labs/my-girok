# Auth Service

> Admin & Operator authentication + MFA + Session + Legal consent + SCIM 2.0 Enterprise (Phase 2) | Port: 3002 | DB: girok_auth

**Phase 2 Migration Applied**: Admin table extended with 83 enterprise fields (SCIM 2.0 Core + JML + NHI)

| Owns                 | Delegates         |
| -------------------- | ----------------- |
| Admin Auth           | -                 |
| Operator Auth        | -                 |
| MFA (TOTP/Backup)    | -                 |
| Session Management   | -                 |
| Legal Documents      | -                 |
| Consent Tracking     | -                 |
| **Admin Profile**    | **Phase 2 (NEW)** |
| **Admin Enterprise** | **Phase 2 (NEW)** |
| **NHI Management**   | **Phase 2 (NEW)** |

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

- `GET /admin/profile/me` - Get own profile
- `GET /admin/profile/:id` - Get admin profile
- `PATCH /admin/profile/:id/scim` - Update SCIM Core
- `PATCH /admin/profile/:id/employee` - Update employee info
- `PATCH /admin/profile/:id/job` - Update job & organization
- `PATCH /admin/profile/:id/joiner` - Update joiner info
- `PATCH /admin/profile/:id/leaver` - Update leaver info
- `POST /admin/enterprise/nhi` - Create NHI
- `POST /admin/enterprise/:id/nhi/rotate` - Rotate NHI credentials
- `POST /admin/enterprise/:id/verify` - Verify identity
- `GET /admin/enterprise/list` - List admins with filters

**SSOT**: `docs/llm/services/auth-service.md`
