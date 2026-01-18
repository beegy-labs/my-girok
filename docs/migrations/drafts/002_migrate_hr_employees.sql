-- DRAFT: Do NOT execute - Design document only
-- Phase 2.2: Migrate HR employees from auth_db.admins to identity_db.accounts
-- NOTE: Cross-DB migration requires application-level orchestration

-- +goose Up

-- Step 1: Create migration tracking table
CREATE TABLE IF NOT EXISTS migration_admin_to_account (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  old_admin_id UUID NOT NULL,
  new_account_id UUID NOT NULL,
  migrated_at TIMESTAMPTZ DEFAULT NOW(),
  rollback_data JSONB,
  UNIQUE(old_admin_id)
);

-- Step 2: Migration query template (execute via application code)
/*
INSERT INTO identity_db.accounts (
  id,
  email,
  password,
  username,
  external_id,
  status,
  mode,
  email_verified,
  mfa_enabled,
  locale,
  timezone,
  country_code,
  display_name,
  given_name,
  family_name,
  nickname,
  preferred_language,
  avatar_url,
  enterprise_profile,
  created_at,
  updated_at
)
SELECT
  a.id,
  a.email,
  a.password,
  COALESCE(a.username, a.email),
  a.external_id,
  -- Status mapping: employment_status -> account status
  -- Note: TERMINATED maps to DEACTIVATED (intentional semantic change)
  -- Downstream systems expecting 'TERMINATED' should check enterprise_profile.employment_status
  CASE a.employment_status
    WHEN 'ACTIVE' THEN 'ACTIVE'
    WHEN 'SUSPENDED' THEN 'SUSPENDED'
    WHEN 'TERMINATED' THEN 'DEACTIVATED'
    ELSE 'ACTIVE'
  END,
  a.account_mode,
  true,
  a.mfa_required,
  a.locale,
  a.timezone,
  a.country_code,
  a.display_name,
  a.given_name,
  a.family_name,
  a.nickname,
  a.preferred_language,
  a.profile_photo_url,
  jsonb_build_object(
    'employee_number', a.employee_number,
    'employee_type', a.employee_type,
    'employment_status', a.employment_status,
    'job', jsonb_build_object(
      'title', a.job_title,
      'code', a.job_code,
      'grade_id', a.job_grade_id
    ),
    'organization', jsonb_build_object(
      'unit_id', a.organization_unit_id,
      'cost_center', a.cost_center
    ),
    -- Manager type determined by whether manager was also migrated
    -- Application code should check migration_admin_to_account table:
    -- IF manager_admin_id IN migrated_ids THEN type='account' ELSE type='admin'
    'manager', jsonb_build_object(
      'id', a.manager_admin_id,
      'type', CASE
        WHEN EXISTS (
          SELECT 1 FROM migration_admin_to_account m
          WHERE m.old_admin_id = a.manager_admin_id
        ) THEN 'account'
        ELSE 'admin'
      END
    ),
    'dates', jsonb_build_object(
      'hire_date', a.hire_date,
      'start_date', a.start_date,
      'termination_date', a.termination_date
    ),
    'skills', a.skills,
    'certifications', a.certifications
  ),
  a.created_at,
  a.updated_at
FROM auth_db.admins a
WHERE
  a.scope = 'TENANT'
  AND a.identity_type = 'HUMAN'
  AND a.role_id NOT IN (SELECT id FROM auth_db.roles WHERE name IN ('MASTER', 'ADMIN'))
  AND a.deleted_at IS NULL;
*/

-- +goose Down
/*
DELETE FROM identity_db.accounts
WHERE id IN (SELECT new_account_id FROM migration_admin_to_account);

DROP TABLE IF EXISTS migration_admin_to_account;
*/
