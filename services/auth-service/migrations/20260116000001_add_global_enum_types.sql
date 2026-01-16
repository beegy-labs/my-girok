-- +goose Up

------------------------------------------------------------
-- Identity & Employee Types
------------------------------------------------------------
CREATE TYPE identity_type AS ENUM (
  'HUMAN', 'SERVICE_ACCOUNT', 'BOT', 'API_CLIENT',
  'MACHINE', 'WORKLOAD', 'SHARED_ACCOUNT', 'EMERGENCY_ACCOUNT'
);

CREATE TYPE employee_type AS ENUM (
  'REGULAR', 'CONTRACT', 'INTERN', 'PART_TIME',
  'VENDOR', 'CONTRACTOR', 'CONSULTANT', 'AGENCY',
  'TEMPORARY', 'SEASONAL',
  'SERVICE_ACCOUNT', 'SYSTEM'
);

CREATE TYPE employment_status AS ENUM (
  'PENDING', 'ACTIVE', 'ON_LEAVE', 'SUSPENDED',
  'NOTICE_PERIOD', 'OFFBOARDING', 'TERMINATED', 'RETIRED', 'DECEASED'
);

CREATE TYPE account_lifecycle_status AS ENUM (
  'STAGED', 'PENDING_APPROVAL', 'PROVISIONED', 'ACTIVE',
  'SUSPENDED', 'LOCKED', 'PASSWORD_EXPIRED',
  'DEPROVISIONING', 'DEACTIVATED', 'DELETED'
);

------------------------------------------------------------
-- Job & Organization Types
------------------------------------------------------------
CREATE TYPE job_family AS ENUM (
  'ENGINEERING', 'PRODUCT', 'DESIGN', 'DATA',
  'SALES', 'MARKETING', 'FINANCE', 'HR', 'LEGAL',
  'OPERATIONS', 'CUSTOMER_SUCCESS', 'IT', 'SECURITY',
  'EXECUTIVE', 'ADMINISTRATIVE', 'OTHER'
);

CREATE TYPE org_unit_type AS ENUM (
  'COMPANY', 'DIVISION', 'DEPARTMENT', 'TEAM', 'GROUP', 'PROJECT'
);

CREATE TYPE partner_type AS ENUM (
  'VENDOR', 'CONTRACTOR', 'CONSULTANT', 'AGENCY',
  'SUPPLIER', 'RESELLER', 'TECHNOLOGY', 'SERVICE'
);

------------------------------------------------------------
-- NHI (Non-Human Identity) Types
------------------------------------------------------------
CREATE TYPE service_account_type AS ENUM (
  'BATCH_PROCESSING', 'API_INTEGRATION', 'ETL_PIPELINE',
  'MONITORING', 'BACKUP_RESTORE', 'CI_CD', 'AUTOMATION_RPA',
  'SCHEDULED_TASK', 'MICROSERVICE', 'EXTERNAL_VENDOR'
);

CREATE TYPE nhi_credential_type AS ENUM (
  'API_KEY', 'OAUTH_CLIENT', 'SERVICE_TOKEN', 'CERTIFICATE',
  'MANAGED_IDENTITY', 'WORKLOAD_IDENTITY'
);

------------------------------------------------------------
-- Security & Access Types
------------------------------------------------------------
CREATE TYPE security_clearance AS ENUM (
  'PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'
);

CREATE TYPE data_access_level AS ENUM (
  'NONE', 'BASIC', 'TEAM', 'DEPARTMENT', 'SERVICE', 'PLATFORM'
);

------------------------------------------------------------
-- Location & Remote Work Types
------------------------------------------------------------
CREATE TYPE remote_work_type AS ENUM (
  'OFFICE', 'HYBRID', 'REMOTE_DOMESTIC',
  'REMOTE_INTERNATIONAL', 'FIELD', 'TRAVEL'
);

CREATE TYPE office_type AS ENUM (
  'HEADQUARTERS', 'REGIONAL', 'BRANCH', 'SATELLITE',
  'COWORKING', 'HOME_OFFICE', 'CLIENT_SITE'
);

------------------------------------------------------------
-- Attendance & Leave Types
------------------------------------------------------------
CREATE TYPE attendance_status AS ENUM (
  'PRESENT', 'ABSENT', 'LATE', 'EARLY_LEAVE',
  'HALF_DAY_AM', 'HALF_DAY_PM', 'REMOTE', 'BUSINESS_TRIP'
);

CREATE TYPE work_type AS ENUM (
  'OFFICE', 'REMOTE', 'HYBRID', 'FIELD',
  'BUSINESS_TRIP', 'CLIENT_SITE', 'TRAINING'
);

CREATE TYPE leave_type AS ENUM (
  'ANNUAL', 'SICK', 'PARENTAL', 'MATERNITY', 'PATERNITY',
  'BEREAVEMENT', 'MARRIAGE', 'UNPAID', 'COMPENSATORY',
  'PUBLIC_HOLIDAY', 'SABBATICAL', 'JURY_DUTY', 'MILITARY',
  'STUDY', 'PERSONAL', 'EMERGENCY'
);

CREATE TYPE leave_status AS ENUM (
  'DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED'
);

------------------------------------------------------------
-- Global Mobility Types
------------------------------------------------------------
CREATE TYPE assignment_type AS ENUM (
  'SHORT_TERM', 'LONG_TERM', 'PERMANENT_TRANSFER',
  'COMMUTER', 'ROTATIONAL', 'PROJECT_BASED'
);

CREATE TYPE visa_status AS ENUM (
  'NOT_REQUIRED', 'PENDING', 'APPROVED', 'ACTIVE',
  'EXPIRING_SOON', 'EXPIRED', 'DENIED', 'REVOKED'
);

CREATE TYPE work_permit_type AS ENUM (
  'CITIZEN', 'PERMANENT_RESIDENT', 'WORK_VISA',
  'STUDENT_VISA', 'BUSINESS_VISA', 'INTRA_COMPANY_TRANSFER'
);

------------------------------------------------------------
-- Delegation Types
------------------------------------------------------------
CREATE TYPE delegation_type AS ENUM (
  'FULL', 'PARTIAL', 'VIEW_ONLY', 'APPROVAL_ONLY', 'EMERGENCY'
);

CREATE TYPE delegation_scope AS ENUM (
  'ALL', 'TEAM', 'DEPARTMENT', 'SERVICE', 'SPECIFIC_RESOURCES'
);

CREATE TYPE delegation_reason AS ENUM (
  'VACATION', 'SICK_LEAVE', 'BUSINESS_TRIP', 'PARENTAL_LEAVE',
  'TRAINING', 'TEMPORARY_ASSIGNMENT', 'EMERGENCY'
);

CREATE TYPE delegation_status AS ENUM (
  'PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED', 'COMPLETED'
);

------------------------------------------------------------
-- Compliance Types
------------------------------------------------------------
CREATE TYPE certification_status AS ENUM (
  'ACTIVE', 'EXPIRED', 'REVOKED', 'PENDING_RENEWAL'
);

CREATE TYPE training_status AS ENUM (
  'NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'WAIVED'
);

CREATE TYPE training_type AS ENUM (
  'SECURITY_AWARENESS', 'COMPLIANCE', 'ROLE_SPECIFIC',
  'ONBOARDING', 'PRIVACY', 'CODE_OF_CONDUCT', 'LEADERSHIP',
  'TECHNICAL', 'SOFT_SKILLS', 'SAFETY'
);

CREATE TYPE attestation_type AS ENUM (
  'ACCEPTABLE_USE_POLICY', 'CODE_OF_CONDUCT', 'CONFIDENTIALITY',
  'DATA_HANDLING', 'SECURITY_AWARENESS', 'GDPR_TRAINING',
  'HIPAA_TRAINING', 'SOX_COMPLIANCE', 'CONFLICT_OF_INTEREST',
  'INSIDER_TRADING', 'ANTI_BRIBERY', 'EXPORT_CONTROL',
  'BACKGROUND_CHECK', 'ACCESS_REVIEW', 'MANAGER_ATTESTATION'
);

CREATE TYPE attestation_status AS ENUM (
  'PENDING', 'COMPLETED', 'EXPIRED', 'WAIVED', 'REJECTED'
);

------------------------------------------------------------
-- Verification Types
------------------------------------------------------------
CREATE TYPE verification_method AS ENUM (
  'DOCUMENT', 'BIOMETRIC', 'VIDEO_CALL', 'IN_PERSON',
  'DIGITAL_CERTIFICATE', 'KNOWLEDGE_BASED'
);

CREATE TYPE verification_level AS ENUM (
  'NONE', 'BASIC', 'STANDARD', 'ENHANCED', 'HIGH_ASSURANCE'
);

-- +goose Down
DROP TYPE IF EXISTS verification_level;
DROP TYPE IF EXISTS verification_method;
DROP TYPE IF EXISTS attestation_status;
DROP TYPE IF EXISTS attestation_type;
DROP TYPE IF EXISTS training_type;
DROP TYPE IF EXISTS training_status;
DROP TYPE IF EXISTS certification_status;
DROP TYPE IF EXISTS delegation_status;
DROP TYPE IF EXISTS delegation_reason;
DROP TYPE IF EXISTS delegation_scope;
DROP TYPE IF EXISTS delegation_type;
DROP TYPE IF EXISTS work_permit_type;
DROP TYPE IF EXISTS visa_status;
DROP TYPE IF EXISTS assignment_type;
DROP TYPE IF EXISTS leave_status;
DROP TYPE IF EXISTS leave_type;
DROP TYPE IF EXISTS work_type;
DROP TYPE IF EXISTS attendance_status;
DROP TYPE IF EXISTS office_type;
DROP TYPE IF EXISTS remote_work_type;
DROP TYPE IF EXISTS data_access_level;
DROP TYPE IF EXISTS security_clearance;
DROP TYPE IF EXISTS nhi_credential_type;
DROP TYPE IF EXISTS service_account_type;
DROP TYPE IF EXISTS partner_type;
DROP TYPE IF EXISTS org_unit_type;
DROP TYPE IF EXISTS job_family;
DROP TYPE IF EXISTS account_lifecycle_status;
DROP TYPE IF EXISTS employment_status;
DROP TYPE IF EXISTS employee_type;
DROP TYPE IF EXISTS identity_type;
