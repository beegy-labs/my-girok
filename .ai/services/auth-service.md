# Auth Service

> Admin & Operator authentication + MFA + Session + Legal + SCIM 2.0 | Port: 3002 | DB: girok_auth

**Status**: Phase 10 Applied (HR Code Removed) | Phase 4 Applied (Advanced Features)

| Owns                              | Delegates  |
| --------------------------------- | ---------- |
| Admin/Operator Auth, MFA, Session | -          |
| Legal Documents, Consent          | -          |
| OAuth Config, Admin Profile       | Phase 1, 2 |
| NHI, Enterprise Features          | Phase 2    |
| Delegation, Compliance            | Phase 4    |
| Global Mobility, Country Config   | Phase 4    |

## Phases

| Phase | Features                         | Tables | Endpoints                                                     |
| ----- | -------------------------------- | ------ | ------------------------------------------------------------- |
| 2     | Enterprise Admin, NHI, Profile   | -      | OAuth(4), Profile(7), Enterprise(4)                           |
| 3     | Admin Account CRUD, Invitations  | -      | Admins(9)                                                     |
| 4     | Delegation, Compliance, Mobility | 15     | Delegation(4), Compliance(4), Mobility(3), Country(2), Org(2) |
| 10    | HR Code Removal                  | 0      | 0                                                             |

**Permissions**: `system_admin:create`, `system_admin:read`, `system_admin:update`, `system_admin:delete`

## Key Features

| Feature             | Description                                              |
| ------------------- | -------------------------------------------------------- |
| **SCIM 2.0**        | Core attributes, employee info, job/org, JML lifecycle   |
| **NHI**             | Service accounts, credential rotation                    |
| **Delegation**      | Authority delegation with approval workflow, constraints |
| **Compliance**      | Attestations, certifications, training tracking          |
| **Global Mobility** | Assignments, work authorizations, country configs        |

## Notes

- **Phase 10**: All HR implementation removed (attendance, leave, delegation, employee modules)
- **HR Tables**: Remain in auth_db for historical reference
- **Future HR**: Will be implemented in separate hr-service

**SSOT**: `docs/llm/services/auth-service.md`
