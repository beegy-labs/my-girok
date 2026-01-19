# HR Service

> Structure Backup Only (NOT Implemented) | Port: 3006 (Reserved) | DB: None

## Current Status (Phase 10 Complete)

- ✅ Structure created (Phase 0)
- ❌ Code NOT migrated from auth-service
- ❌ Database NOT created
- ❌ Service NOT runnable
- ✅ HR code removed from auth-service (Phase 10)

## HR Data Location

**Code**: None (deleted from auth-service in Phase 10)
**Backup**: `~/auth-service-hr-backup-20260119.tar.gz`
**Data**: auth_db tables (kept for historical reference)

HR tables in auth_db:

- attendance_records, work_schedules, overtime_requests
- leave_requests, leave_balances
- delegations, delegation_logs
- organization_history, compliance_attestations, compliance_certifications
- training_assignments, training_completions
- global_mobility_assignments, work_authorizations
- country_configs

## Future Implementation

If HR functionality is needed in the future:

1. Restore code from backup: `~/auth-service-hr-backup-20260119.tar.gz`
2. Implement in hr-service
3. Migrate data from auth_db to hr_db
4. Update API gateway routing

**SSOT**: `docs/llm/services/hr-service.md`
