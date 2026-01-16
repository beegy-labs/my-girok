-- +goose Up
-- ==============================================================================
-- Phase 2: Extend admins Table (Core Fields)
-- ==============================================================================
-- This migration extends the admins table with core enterprise fields:
-- - SCIM 2.0 Core attributes
-- - Employee information
-- - Job & Organization references
-- - Partner company references
-- - JML (Joiner-Mover-Leaver) lifecycle dates
-- - NHI (Non-Human Identity) attributes
-- - Location references
-- - Access control settings
-- - JSONB extensions for flexible data

------------------------------------------------------------
-- SCIM 2.0 Core
------------------------------------------------------------
ALTER TABLE admins ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS given_name TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS family_name TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS native_given_name TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS native_family_name TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en';
ALTER TABLE admins ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'en-US';
ALTER TABLE admins ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
ALTER TABLE admins ADD COLUMN IF NOT EXISTS profile_url TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

------------------------------------------------------------
-- Employee Info (SCIM Enterprise)
------------------------------------------------------------
ALTER TABLE admins ADD COLUMN IF NOT EXISTS employee_number TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS employee_type employee_type DEFAULT 'REGULAR';
ALTER TABLE admins ADD COLUMN IF NOT EXISTS employment_status employment_status DEFAULT 'ACTIVE';
ALTER TABLE admins ADD COLUMN IF NOT EXISTS lifecycle_status account_lifecycle_status DEFAULT 'ACTIVE';

------------------------------------------------------------
-- Job & Organization
------------------------------------------------------------
ALTER TABLE admins ADD COLUMN IF NOT EXISTS job_grade_id TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS job_title_en TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS job_code TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS job_family job_family;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS organization_unit_id TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS cost_center TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS manager_admin_id TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS dotted_line_manager_id TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS direct_reports_count INT DEFAULT 0;

------------------------------------------------------------
-- Partner
------------------------------------------------------------
ALTER TABLE admins ADD COLUMN IF NOT EXISTS partner_company_id TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS partner_employee_id TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS partner_contract_end_date DATE;

------------------------------------------------------------
-- JML Lifecycle - Joiner
------------------------------------------------------------
ALTER TABLE admins ADD COLUMN IF NOT EXISTS hire_date DATE;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS original_hire_date DATE;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ(6);
ALTER TABLE admins ADD COLUMN IF NOT EXISTS probation_end_date DATE;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS probation_status TEXT DEFAULT 'NOT_APPLICABLE';

------------------------------------------------------------
-- JML Lifecycle - Mover
------------------------------------------------------------
ALTER TABLE admins ADD COLUMN IF NOT EXISTS last_role_change_at TIMESTAMPTZ(6);
ALTER TABLE admins ADD COLUMN IF NOT EXISTS last_promotion_date DATE;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS last_transfer_date DATE;

------------------------------------------------------------
-- JML Lifecycle - Leaver
------------------------------------------------------------
ALTER TABLE admins ADD COLUMN IF NOT EXISTS termination_date DATE;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS last_working_day DATE;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS termination_reason TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS termination_type TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS eligible_for_rehire BOOLEAN;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS exit_interview_completed BOOLEAN DEFAULT FALSE;

------------------------------------------------------------
-- NHI (Non-Human Identity)
------------------------------------------------------------
ALTER TABLE admins ADD COLUMN IF NOT EXISTS identity_type identity_type DEFAULT 'HUMAN';
ALTER TABLE admins ADD COLUMN IF NOT EXISTS owner_admin_id TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS secondary_owner_id TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS nhi_purpose TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS service_account_type service_account_type;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS credential_type nhi_credential_type;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS secret_rotation_days INT DEFAULT 90;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS nhi_expiry_date DATE;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS last_credential_rotation TIMESTAMPTZ(6);
ALTER TABLE admins ADD COLUMN IF NOT EXISTS nhi_config JSONB DEFAULT '{}';

------------------------------------------------------------
-- Location (Physical)
------------------------------------------------------------
ALTER TABLE admins ADD COLUMN IF NOT EXISTS legal_entity_id TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS primary_office_id TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS building_id TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS floor_id TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS desk_code TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS remote_work_type remote_work_type DEFAULT 'OFFICE';

------------------------------------------------------------
-- Location (Tax/Legal)
------------------------------------------------------------
ALTER TABLE admins ADD COLUMN IF NOT EXISTS legal_country_code TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS work_country_code TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS tax_residence_country TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS payroll_country_code TEXT;

------------------------------------------------------------
-- Contact
------------------------------------------------------------
ALTER TABLE admins ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS phone_country_code TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS mobile_number TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS mobile_country_code TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS work_phone TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS emergency_contact JSONB DEFAULT '{}';

------------------------------------------------------------
-- Access Control
------------------------------------------------------------
ALTER TABLE admins ADD COLUMN IF NOT EXISTS security_clearance security_clearance DEFAULT 'INTERNAL';
ALTER TABLE admins ADD COLUMN IF NOT EXISTS data_access_level data_access_level DEFAULT 'BASIC';
ALTER TABLE admins ADD COLUMN IF NOT EXISTS access_end_date DATE;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS allowed_ip_ranges TEXT[];

------------------------------------------------------------
-- Identity Verification
------------------------------------------------------------
ALTER TABLE admins ADD COLUMN IF NOT EXISTS identity_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS identity_verified_at TIMESTAMPTZ(6);
ALTER TABLE admins ADD COLUMN IF NOT EXISTS verification_method verification_method;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS verification_level verification_level DEFAULT 'NONE';
ALTER TABLE admins ADD COLUMN IF NOT EXISTS background_check_status TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS background_check_date DATE;

------------------------------------------------------------
-- JSONB Extensions
------------------------------------------------------------
ALTER TABLE admins ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]';
ALTER TABLE admins ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]';
ALTER TABLE admins ADD COLUMN IF NOT EXISTS education JSONB DEFAULT '[]';
ALTER TABLE admins ADD COLUMN IF NOT EXISTS work_history JSONB DEFAULT '[]';
ALTER TABLE admins ADD COLUMN IF NOT EXISTS custom_attributes JSONB DEFAULT '{}';
ALTER TABLE admins ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
ALTER TABLE admins ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

------------------------------------------------------------
-- Indexes for Performance
------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admins_employee_number ON admins(employee_number) WHERE employee_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admins_job_grade_id ON admins(job_grade_id) WHERE job_grade_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admins_organization_unit_id ON admins(organization_unit_id) WHERE organization_unit_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admins_partner_company_id ON admins(partner_company_id) WHERE partner_company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admins_manager_admin_id ON admins(manager_admin_id) WHERE manager_admin_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admins_owner_admin_id ON admins(owner_admin_id) WHERE owner_admin_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admins_legal_entity_id ON admins(legal_entity_id) WHERE legal_entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admins_primary_office_id ON admins(primary_office_id) WHERE primary_office_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admins_identity_type ON admins(identity_type);
CREATE INDEX IF NOT EXISTS idx_admins_employee_type ON admins(employee_type);
CREATE INDEX IF NOT EXISTS idx_admins_employment_status ON admins(employment_status);
CREATE INDEX IF NOT EXISTS idx_admins_lifecycle_status ON admins(lifecycle_status);

------------------------------------------------------------
-- Comments for Documentation
------------------------------------------------------------
COMMENT ON COLUMN admins.username IS 'SCIM userName - unique identifier for authentication';
COMMENT ON COLUMN admins.external_id IS 'External system identifier (HR system, etc.)';
COMMENT ON COLUMN admins.employee_number IS 'Company employee number';
COMMENT ON COLUMN admins.identity_type IS 'HUMAN or Non-Human Identity (SERVICE_ACCOUNT, BOT, etc.)';
COMMENT ON COLUMN admins.owner_admin_id IS 'For NHI: Human owner of this non-human identity';
COMMENT ON COLUMN admins.job_grade_id IS 'Reference to job_grades table';
COMMENT ON COLUMN admins.organization_unit_id IS 'Reference to organization_units table';
COMMENT ON COLUMN admins.partner_company_id IS 'Reference to partner_companies table (for contractors/vendors)';
COMMENT ON COLUMN admins.manager_admin_id IS 'Direct manager reference';
COMMENT ON COLUMN admins.legal_entity_id IS 'Legal entity for payroll/tax purposes';
COMMENT ON COLUMN admins.primary_office_id IS 'Primary work location';
COMMENT ON COLUMN admins.skills IS 'JSONB array of skill objects';
COMMENT ON COLUMN admins.certifications IS 'JSONB array of certification objects';
COMMENT ON COLUMN admins.metadata IS 'JSONB for custom extensible data';

-- +goose Down
-- ==============================================================================
-- Rollback Phase 2 Extensions
-- ==============================================================================

-- Drop indexes
DROP INDEX IF EXISTS idx_admins_username;
DROP INDEX IF EXISTS idx_admins_employee_number;
DROP INDEX IF EXISTS idx_admins_job_grade_id;
DROP INDEX IF EXISTS idx_admins_organization_unit_id;
DROP INDEX IF EXISTS idx_admins_partner_company_id;
DROP INDEX IF EXISTS idx_admins_manager_admin_id;
DROP INDEX IF EXISTS idx_admins_owner_admin_id;
DROP INDEX IF EXISTS idx_admins_legal_entity_id;
DROP INDEX IF EXISTS idx_admins_primary_office_id;
DROP INDEX IF EXISTS idx_admins_identity_type;
DROP INDEX IF EXISTS idx_admins_employee_type;
DROP INDEX IF EXISTS idx_admins_employment_status;
DROP INDEX IF EXISTS idx_admins_lifecycle_status;

-- Drop columns (reverse order)
ALTER TABLE admins DROP COLUMN IF EXISTS metadata;
ALTER TABLE admins DROP COLUMN IF EXISTS preferences;
ALTER TABLE admins DROP COLUMN IF EXISTS custom_attributes;
ALTER TABLE admins DROP COLUMN IF EXISTS work_history;
ALTER TABLE admins DROP COLUMN IF EXISTS education;
ALTER TABLE admins DROP COLUMN IF EXISTS certifications;
ALTER TABLE admins DROP COLUMN IF EXISTS skills;

ALTER TABLE admins DROP COLUMN IF EXISTS background_check_date;
ALTER TABLE admins DROP COLUMN IF EXISTS background_check_status;
ALTER TABLE admins DROP COLUMN IF EXISTS verification_level;
ALTER TABLE admins DROP COLUMN IF EXISTS verification_method;
ALTER TABLE admins DROP COLUMN IF EXISTS identity_verified_at;
ALTER TABLE admins DROP COLUMN IF EXISTS identity_verified;

ALTER TABLE admins DROP COLUMN IF EXISTS allowed_ip_ranges;
ALTER TABLE admins DROP COLUMN IF EXISTS access_end_date;
ALTER TABLE admins DROP COLUMN IF EXISTS data_access_level;
ALTER TABLE admins DROP COLUMN IF EXISTS security_clearance;

ALTER TABLE admins DROP COLUMN IF EXISTS emergency_contact;
ALTER TABLE admins DROP COLUMN IF EXISTS work_phone;
ALTER TABLE admins DROP COLUMN IF EXISTS mobile_country_code;
ALTER TABLE admins DROP COLUMN IF EXISTS mobile_number;
ALTER TABLE admins DROP COLUMN IF EXISTS phone_country_code;
ALTER TABLE admins DROP COLUMN IF EXISTS phone_number;

ALTER TABLE admins DROP COLUMN IF EXISTS payroll_country_code;
ALTER TABLE admins DROP COLUMN IF EXISTS tax_residence_country;
ALTER TABLE admins DROP COLUMN IF EXISTS work_country_code;
ALTER TABLE admins DROP COLUMN IF EXISTS legal_country_code;

ALTER TABLE admins DROP COLUMN IF EXISTS remote_work_type;
ALTER TABLE admins DROP COLUMN IF EXISTS desk_code;
ALTER TABLE admins DROP COLUMN IF EXISTS floor_id;
ALTER TABLE admins DROP COLUMN IF EXISTS building_id;
ALTER TABLE admins DROP COLUMN IF EXISTS primary_office_id;
ALTER TABLE admins DROP COLUMN IF EXISTS legal_entity_id;

ALTER TABLE admins DROP COLUMN IF EXISTS nhi_config;
ALTER TABLE admins DROP COLUMN IF EXISTS last_credential_rotation;
ALTER TABLE admins DROP COLUMN IF EXISTS nhi_expiry_date;
ALTER TABLE admins DROP COLUMN IF EXISTS secret_rotation_days;
ALTER TABLE admins DROP COLUMN IF EXISTS credential_type;
ALTER TABLE admins DROP COLUMN IF EXISTS service_account_type;
ALTER TABLE admins DROP COLUMN IF EXISTS nhi_purpose;
ALTER TABLE admins DROP COLUMN IF EXISTS secondary_owner_id;
ALTER TABLE admins DROP COLUMN IF EXISTS owner_admin_id;
ALTER TABLE admins DROP COLUMN IF EXISTS identity_type;

ALTER TABLE admins DROP COLUMN IF EXISTS exit_interview_completed;
ALTER TABLE admins DROP COLUMN IF EXISTS eligible_for_rehire;
ALTER TABLE admins DROP COLUMN IF EXISTS termination_type;
ALTER TABLE admins DROP COLUMN IF EXISTS termination_reason;
ALTER TABLE admins DROP COLUMN IF EXISTS last_working_day;
ALTER TABLE admins DROP COLUMN IF EXISTS termination_date;

ALTER TABLE admins DROP COLUMN IF EXISTS last_transfer_date;
ALTER TABLE admins DROP COLUMN IF EXISTS last_promotion_date;
ALTER TABLE admins DROP COLUMN IF EXISTS last_role_change_at;

ALTER TABLE admins DROP COLUMN IF EXISTS probation_status;
ALTER TABLE admins DROP COLUMN IF EXISTS probation_end_date;
ALTER TABLE admins DROP COLUMN IF EXISTS onboarding_completed_at;
ALTER TABLE admins DROP COLUMN IF EXISTS start_date;
ALTER TABLE admins DROP COLUMN IF EXISTS original_hire_date;
ALTER TABLE admins DROP COLUMN IF EXISTS hire_date;

ALTER TABLE admins DROP COLUMN IF EXISTS partner_contract_end_date;
ALTER TABLE admins DROP COLUMN IF EXISTS partner_employee_id;
ALTER TABLE admins DROP COLUMN IF EXISTS partner_company_id;

ALTER TABLE admins DROP COLUMN IF EXISTS direct_reports_count;
ALTER TABLE admins DROP COLUMN IF EXISTS dotted_line_manager_id;
ALTER TABLE admins DROP COLUMN IF EXISTS manager_admin_id;
ALTER TABLE admins DROP COLUMN IF EXISTS cost_center;
ALTER TABLE admins DROP COLUMN IF EXISTS organization_unit_id;
ALTER TABLE admins DROP COLUMN IF EXISTS job_family;
ALTER TABLE admins DROP COLUMN IF EXISTS job_code;
ALTER TABLE admins DROP COLUMN IF EXISTS job_title_en;
ALTER TABLE admins DROP COLUMN IF EXISTS job_title;
ALTER TABLE admins DROP COLUMN IF EXISTS job_grade_id;

ALTER TABLE admins DROP COLUMN IF EXISTS lifecycle_status;
ALTER TABLE admins DROP COLUMN IF EXISTS employment_status;
ALTER TABLE admins DROP COLUMN IF EXISTS employee_type;
ALTER TABLE admins DROP COLUMN IF EXISTS employee_number;

ALTER TABLE admins DROP COLUMN IF EXISTS profile_photo_url;
ALTER TABLE admins DROP COLUMN IF EXISTS profile_url;
ALTER TABLE admins DROP COLUMN IF EXISTS timezone;
ALTER TABLE admins DROP COLUMN IF EXISTS locale;
ALTER TABLE admins DROP COLUMN IF EXISTS preferred_language;
ALTER TABLE admins DROP COLUMN IF EXISTS nickname;
ALTER TABLE admins DROP COLUMN IF EXISTS native_family_name;
ALTER TABLE admins DROP COLUMN IF EXISTS native_given_name;
ALTER TABLE admins DROP COLUMN IF EXISTS family_name;
ALTER TABLE admins DROP COLUMN IF EXISTS given_name;
ALTER TABLE admins DROP COLUMN IF EXISTS display_name;
ALTER TABLE admins DROP COLUMN IF EXISTS external_id;
ALTER TABLE admins DROP COLUMN IF EXISTS username;
