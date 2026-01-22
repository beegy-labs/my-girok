# Auth Service Database Schema

> Complete database schema documentation for the auth-service.

## Overview

The auth-service database contains tables for admin management, organization structure, attendance, leave management, delegation, compliance, and global mobility features.

---

## Admins Table (83 fields)

The core table storing admin user information across multiple field groups.

| Field Group         | Key Fields                                                                              | Purpose                      |
| ------------------- | --------------------------------------------------------------------------------------- | ---------------------------- |
| **Primary Info**    | id, email, password, name, is_active                                                    | Core authentication          |
| **SCIM Core**       | username, externalId, displayName, givenName, familyName                                | Standard identity attributes |
| **Employee Info**   | employeeNumber, employeeType, employmentStatus, lifecycleStatus                         | HR data (SCIM Enterprise)    |
| **JML Lifecycle**   | hireDate, terminationDate, lastPromotionDate, probationStatus                           | Employee lifecycle dates     |
| **Job & Org**       | jobTitle, jobGradeId, organizationUnitId, managerAdminId, costCenter                    | Company hierarchy            |
| **NHI**             | identityType, ownerAdminId, serviceAccountType, credentialType, secretRotationDays      | Bot/service identity         |
| **Location**        | primaryOfficeId, buildingId, floorId, deskCode, remoteWorkType                          | Physical location            |
| **Tax/Legal**       | workCountryCode, taxResidenceCountry, payrollCountryCode, legalCountryCode              | Tax/legal tracking           |
| **Access Control**  | securityClearance, dataAccessLevel, allowedIpRanges, accessEndDate                      | Security attributes          |
| **Verification**    | identityVerified, verificationMethod, verificationLevel, backgroundCheckStatus          | KYC/AML status               |
| **JSON Extensions** | skills, certifications, education, workHistory, customAttributes, preferences, metadata | Flexible JSONB storage       |

**Migration:** `20260116000006_extend_admins_phase2_core.sql`

---

## Additional Tables

| Table                        | Purpose                   | Relations                                               |
| ---------------------------- | ------------------------- | ------------------------------------------------------- |
| `admin_attendances`          | Clock in/out records      | admin_id -> admins                                      |
| `admin_work_schedules`       | Work schedule configs     | admin_id -> admins                                      |
| `admin_leaves`               | Leave requests            | admin_id -> admins                                      |
| `admin_leave_balances`       | Annual leave tracking     | admin_id -> admins                                      |
| `admin_delegations`          | Authority delegation      | delegator_id, delegate_id -> admins                     |
| `admin_attestations`         | Compliance attestations   | admin_id -> admins                                      |
| `admin_certifications`       | Professional certs        | admin_id -> admins                                      |
| `admin_training_records`     | Training completion       | admin_id -> admins                                      |
| `global_assignments`         | International assignments | admin_id -> admins                                      |
| `work_authorizations`        | Visas/work permits        | admin_id -> admins, assignment_id -> global_assignments |
| `country_configs`            | Country HR policies       | None (12 countries pre-populated)                       |
| `admin_organization_history` | Org change tracking       | admin_id -> admins                                      |
| `job_grade`                  | Job levels/tracks         | None                                                    |
| `organization_unit`          | Org hierarchy (tree)      | parent_id -> self                                       |
| `legal_entity`               | Legal companies           | None                                                    |
| `office`                     | Physical offices          | legal_entity_id -> legal_entity                         |
| `building`                   | Buildings in offices      | office_id -> office                                     |
| `floor`                      | Floors in buildings       | building_id -> building                                 |
| `partner_company`            | External partners         | None                                                    |

---

## Database Indexes

Key indexes for performance optimization:

```yaml
admins:
  - username (UNIQUE): SCIM lookup
  - employee_number (UNIQUE): Employee lookup
  - manager_admin_id: Hierarchy queries
  - organization_unit_id: Org filtering
  - identity_type: NHI filtering
```

---

## Migrations

The database schema is built through a series of migrations:

```yaml
phase2: 20260116000006_extend_admins_phase2_core.sql (83 fields)
phase3:
  - 20260117000007_add_attendance.sql
  - 20260117000008_add_leave_management.sql
phase4: 20260118000009_add_phase4_tables.sql (15 tables, 15 enums)
phase5: No new tables (reuses existing)
```

---

## Related Documentation

- **Enums & Types**: `auth-service-database-enums.md`
- **Main Documentation**: `auth-service.md`
- **Implementation**: `auth-service-impl.md`

---

_This document is auto-generated from `docs/llm/services/auth-service-database.md`_
