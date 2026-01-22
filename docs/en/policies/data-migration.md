# Data Migration Design: admins → accounts

> Migration plan for HR employee data separation

**Version**: 1.0 | **Status**: Design Document (NOT EXECUTED)

## Overview

This document outlines the plan for migrating HR employee data from `auth_db.admins` to `identity_db.accounts` while keeping System Admins in the auth database. This separation enables cleaner domain boundaries and better scalability.

## Data Separation Criteria

### Keep in auth_db.admins

Records that remain in the auth database:

- `scope = SYSTEM`
- `identity_type IN (SERVICE_ACCOUNT, BOT, API_CLIENT, MACHINE, WORKLOAD)`
- `role IN (MASTER, ADMIN)`

### Move to identity_db.accounts

Records that migrate to the identity database:

- `scope = TENANT`
- `identity_type = HUMAN`
- `role NOT IN (MASTER, ADMIN)`
- All HR employee-specific data

## Field Migration Mapping

### Category 1: Core Identity (KEEP in admins)

These fields remain in the admins table as they're essential for authentication:

```
id, email, password, name, scope, tenant_id, role_id, is_active
last_login_at, mfa_required, password_changed_at
created_at, updated_at, deleted_at
```

### Category 2: SCIM 2.0 Core (MOVE to accounts)

Standard user profile fields following SCIM 2.0 specification:

```
username, external_id, display_name, given_name, family_name
nickname, preferred_language, locale, timezone
profile_url, profile_photo_url
```

### Category 3: HR/Enterprise (MOVE to accounts.enterprise_profile JSONB)

HR-specific data stored as a JSONB field for flexibility:

```
employee_number, employee_type, employment_status
job_title, job_grade_id, organization_unit_id, cost_center
manager_admin_id, hire_date, termination_date
skills, certifications, education, work_history
```

### Category 4: NHI Fields (KEEP in admins for service accounts)

Non-Human Identity fields for automated systems:

```
identity_type, owner_admin_id, nhi_purpose
service_account_type, credential_type, secret_rotation_days
```

## Migration Phases

### Phase 2.1: Extend accounts Schema

Add necessary columns to the accounts table:

```sql
-- Add SCIM 2.0 + Profile columns to identity_db.accounts
ALTER TABLE accounts ADD COLUMN external_id TEXT;
ALTER TABLE accounts ADD COLUMN display_name TEXT;
ALTER TABLE accounts ADD COLUMN enterprise_profile JSONB;
-- Additional columns as needed
```

### Phase 2.2: Data Migration

Migrate HR employee records with enterprise profile:

```sql
-- Insert HR employees into accounts with enterprise_profile JSONB
INSERT INTO identity_db.accounts (
  id, email, password, display_name, enterprise_profile
)
SELECT
  id, email, password, display_name,
  jsonb_build_object(
    'employee_number', employee_number,
    'job_title', job_title,
    'department', organization_unit_id,
    'hire_date', hire_date
  )
FROM auth_db.admins
WHERE scope = 'TENANT' AND identity_type = 'HUMAN';
```

### Phase 2.3: FK Reference Updates

Handle foreign key references across databases:

| Table              | Strategy                             |
| ------------------ | ------------------------------------ |
| AdminDelegation    | Soft reference with user_type column |
| AdminAttestation   | gRPC lookup for cross-DB             |
| attendance_records | Reference accounts.id                |

### Phase 2.4: admins Table Cleanup

After successful migration:

1. Create backup: `admins_backup_phase2`
2. Drop HR-specific columns
3. Delete migrated records

## Manager ID Remapping

### The Problem

The `manager_admin_id` field may reference admins that either stay in auth_db or move to identity_db.

### Solution: Dual Reference

Store manager references with type information:

```json
{
  "manager": {
    "type": "account", // or "admin"
    "id": "uuid",
    "display_name": "cached"
  }
}
```

### Resolution Service

The **Identity Service** resolves the dual-reference `manager` field:

1. When a user profile is requested, Identity Service checks `manager.type`
2. If `type = "account"`: Direct lookup in `identity_db.accounts`
3. If `type = "admin"`: gRPC call to Auth Service for admin lookup
4. Returns unified manager object with `id`, `display_name`, `email`

```
Client → Identity Service → accounts table (type=account)
                         → Auth Service (gRPC) → admins table (type=admin)
```

## Rollback Strategy

| Level | Scope         | Method                           |
| ----- | ------------- | -------------------------------- |
| 1     | Single record | Use tracking table rollback_data |
| 2     | Batch         | Reverse migration script         |
| 3     | Full          | Restore from backup table        |
| 4     | Disaster      | Point-in-time recovery           |

### Migration Tracking Table

Track all migrations for rollback capability:

```sql
CREATE TABLE migration_admin_to_account (
  id UUID PRIMARY KEY,
  old_admin_id UUID NOT NULL UNIQUE,
  new_account_id UUID NOT NULL,
  migrated_at TIMESTAMPTZ DEFAULT NOW(),
  rollback_data JSONB
);
```

## Validation Queries

### Pre-Migration Validation

```sql
-- Count by type to understand data distribution
SELECT scope, identity_type, COUNT(*)
FROM admins WHERE deleted_at IS NULL
GROUP BY scope, identity_type;
```

### Post-Migration Validation

```sql
-- Verify migration count matches
SELECT
  (SELECT COUNT(*) FROM migration_admin_to_account) as migrated,
  (SELECT COUNT(*) FROM accounts WHERE enterprise_profile IS NOT NULL) as accounts;

-- Verify no HR data remains in admins
SELECT COUNT(*) FROM admins
WHERE scope = 'TENANT' AND identity_type = 'HUMAN';
-- Should return 0
```

## Risk Assessment

| Risk             | Impact   | Mitigation                        |
| ---------------- | -------- | --------------------------------- |
| Data loss        | Critical | Backup table, validation scripts  |
| FK violations    | High     | Soft references, staged migration |
| Cross-DB failure | High     | Application-level orchestration   |
| Manager broken   | Medium   | Dual reference system             |

## Precautions

Before executing the migration:

1. **Full database backup** before migration
2. **Staging environment testing** first
3. **Incremental migration** (batch of 1000 records)
4. **Monitoring dashboards** for real-time status
5. **Rollback rehearsal** to ensure recovery works

## NOT Included (Future Phases)

This design document does not cover:

- Actual migration execution (Phase 3+)
- Application code changes
- Service refactoring

These items will be addressed in subsequent phases.

## Related Documentation

- Identity Platform: `docs/en/policies/identity-platform.md`
- Database Policy: `docs/en/policies/database.md`

---

_This document is auto-generated from `docs/llm/policies/data-migration.md`_
