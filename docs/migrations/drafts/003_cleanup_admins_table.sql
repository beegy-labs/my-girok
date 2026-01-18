-- DRAFT: Do NOT execute - Design document only
-- Phase 2.4: Cleanup admins table after HR migration
-- CAUTION: Only run AFTER successful data migration and validation

-- +goose Up

-- Step 1: Create backup table
CREATE TABLE admins_backup_phase2 AS SELECT * FROM admins;

-- Step 2: Drop HR-specific columns

-- JML Lifecycle columns
ALTER TABLE admins DROP COLUMN IF EXISTS hire_date;
ALTER TABLE admins DROP COLUMN IF EXISTS original_hire_date;
ALTER TABLE admins DROP COLUMN IF EXISTS start_date;
ALTER TABLE admins DROP COLUMN IF EXISTS onboarding_completed_at;
ALTER TABLE admins DROP COLUMN IF EXISTS probation_end_date;
ALTER TABLE admins DROP COLUMN IF EXISTS probation_status;
ALTER TABLE admins DROP COLUMN IF EXISTS last_role_change_at;
ALTER TABLE admins DROP COLUMN IF EXISTS last_promotion_date;
ALTER TABLE admins DROP COLUMN IF EXISTS last_transfer_date;
ALTER TABLE admins DROP COLUMN IF EXISTS termination_date;
ALTER TABLE admins DROP COLUMN IF EXISTS last_working_day;
ALTER TABLE admins DROP COLUMN IF EXISTS termination_reason;
ALTER TABLE admins DROP COLUMN IF EXISTS termination_type;
ALTER TABLE admins DROP COLUMN IF EXISTS eligible_for_rehire;
ALTER TABLE admins DROP COLUMN IF EXISTS exit_interview_completed;

-- Partner columns
ALTER TABLE admins DROP COLUMN IF EXISTS partner_company_id;
ALTER TABLE admins DROP COLUMN IF EXISTS partner_employee_id;
ALTER TABLE admins DROP COLUMN IF EXISTS partner_contract_end_date;

-- Location columns
ALTER TABLE admins DROP COLUMN IF EXISTS legal_entity_id;
ALTER TABLE admins DROP COLUMN IF EXISTS primary_office_id;
ALTER TABLE admins DROP COLUMN IF EXISTS building_id;
ALTER TABLE admins DROP COLUMN IF EXISTS floor_id;
ALTER TABLE admins DROP COLUMN IF EXISTS desk_code;
ALTER TABLE admins DROP COLUMN IF EXISTS remote_work_type;
ALTER TABLE admins DROP COLUMN IF EXISTS legal_country_code;
ALTER TABLE admins DROP COLUMN IF EXISTS work_country_code;
ALTER TABLE admins DROP COLUMN IF EXISTS tax_residence_country;
ALTER TABLE admins DROP COLUMN IF EXISTS payroll_country_code;

-- Contact columns
ALTER TABLE admins DROP COLUMN IF EXISTS work_phone;
ALTER TABLE admins DROP COLUMN IF EXISTS emergency_contact;

-- Verification columns
ALTER TABLE admins DROP COLUMN IF EXISTS identity_verified;
ALTER TABLE admins DROP COLUMN IF EXISTS identity_verified_at;
ALTER TABLE admins DROP COLUMN IF EXISTS verification_method;
ALTER TABLE admins DROP COLUMN IF EXISTS verification_level;
ALTER TABLE admins DROP COLUMN IF EXISTS background_check_status;
ALTER TABLE admins DROP COLUMN IF EXISTS background_check_date;

-- JSONB extensions
ALTER TABLE admins DROP COLUMN IF EXISTS skills;
ALTER TABLE admins DROP COLUMN IF EXISTS certifications;
ALTER TABLE admins DROP COLUMN IF EXISTS education;
ALTER TABLE admins DROP COLUMN IF EXISTS work_history;

-- Step 3: Delete migrated HR records
DELETE FROM admins
WHERE id IN (SELECT old_admin_id FROM migration_admin_to_account);

-- Step 4: Drop HR-specific indexes
DROP INDEX IF EXISTS idx_admins_employee_type;
DROP INDEX IF EXISTS idx_admins_employment_status;
DROP INDEX IF EXISTS idx_admins_lifecycle_status;

-- +goose Down
-- Full rollback requires restoring from admins_backup_phase2
-- Recommend point-in-time recovery for disaster scenarios
