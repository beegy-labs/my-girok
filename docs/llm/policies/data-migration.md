# Data Migration Design: admins → accounts

> **Version**: 1.0 | **Last Updated**: 2026-01-18 | **Status**: Design Document (NOT EXECUTED)

## Overview

Plan for migrating HR employee data from `auth_db.admins` to `identity_db.accounts` while keeping System Admins in auth_db.

## Data Separation Criteria

### Keep in auth_db.admins

- `scope = SYSTEM`
- `identity_type IN (SERVICE_ACCOUNT, BOT, API_CLIENT, MACHINE, WORKLOAD)`
- `role IN (MASTER, ADMIN)`

### Move to identity_db.accounts

- `scope = TENANT`
- `identity_type = HUMAN`
- `role NOT IN (MASTER, ADMIN)`
- All HR employee-specific data

## Field Migration Mapping

### Category 1: Core Identity (KEEP in admins)

```
id, email, password, name, scope, tenant_id, role_id, is_active
last_login_at, mfa_required, password_changed_at
created_at, updated_at, deleted_at
```

### Category 2: SCIM 2.0 Core (MOVE to accounts)

```
username, external_id, display_name, given_name, family_name
nickname, preferred_language, locale, timezone
profile_url, profile_photo_url
```

### Category 3: HR/Enterprise (MOVE to accounts.enterprise_profile JSONB)

```
employee_number, employee_type, employment_status
job_title, job_grade_id, organization_unit_id, cost_center
manager_admin_id, hire_date, termination_date
skills, certifications, education, work_history
```

### Category 4: NHI Fields (KEEP in admins for service accounts)

```
identity_type, owner_admin_id, nhi_purpose
service_account_type, credential_type, secret_rotation_days
```

## Migration Phases

### Phase 2.1: Extend accounts Schema

```sql
-- Add SCIM 2.0 + Profile columns to identity_db.accounts
ALTER TABLE accounts ADD COLUMN external_id TEXT;
ALTER TABLE accounts ADD COLUMN display_name TEXT;
ALTER TABLE accounts ADD COLUMN enterprise_profile JSONB;
-- etc.
```

### Phase 2.2: Data Migration

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

| Table              | Strategy                             |
| ------------------ | ------------------------------------ |
| AdminDelegation    | Soft reference with user_type column |
| AdminAttestation   | gRPC lookup for cross-DB             |
| attendance_records | Reference accounts.id                |

### Phase 2.4: admins Table Cleanup

- Create backup: `admins_backup_phase2`
- Drop HR-specific columns
- Delete migrated records

## Manager ID Remapping

### Problem

`manager_admin_id` may reference admins that stay or move.

### Solution: Dual Reference

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

The **Identity Service** is responsible for resolving the dual-reference `manager` field:

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

### Pre-Migration

```sql
-- Count by type
SELECT scope, identity_type, COUNT(*)
FROM admins WHERE deleted_at IS NULL
GROUP BY scope, identity_type;
```

### Post-Migration

```sql
-- Verify migration count
SELECT
  (SELECT COUNT(*) FROM migration_admin_to_account) as migrated,
  (SELECT COUNT(*) FROM accounts WHERE enterprise_profile IS NOT NULL) as accounts;

-- Verify no HR data in admins
SELECT COUNT(*) FROM admins
WHERE scope = 'TENANT' AND identity_type = 'HUMAN';
-- Should be 0
```

## Risk Assessment

| Risk             | Impact   | Mitigation                        |
| ---------------- | -------- | --------------------------------- |
| Data loss        | Critical | Backup table, validation scripts  |
| FK violations    | High     | Soft references, staged migration |
| Cross-DB failure | High     | Application-level orchestration   |
| Manager broken   | Medium   | Dual reference system             |

## Precautions

1. Full database backup before migration
2. Staging environment testing first
3. Incremental migration (batch of 1000)
4. Monitoring dashboards
5. Rollback rehearsal

## NOT Included (Future Phases)

- Actual migration execution (Phase 3+)
- Application code changes
- Service refactoring
