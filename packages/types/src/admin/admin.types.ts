/**
 * Admin Enterprise Types (Phase 2)
 * Based on SCIM 2.0 Enterprise User Schema + JML + NHI extensions
 */

import {
  AccountLifecycleStatus,
  DataAccessLevel,
  EmployeeType,
  EmploymentStatus,
  IdentityType,
  JobFamily,
  NhiCredentialType,
  ProbationStatus,
  RemoteWorkType,
  SecurityClearance,
  ServiceAccountType,
  VerificationLevel,
  VerificationMethod,
} from './admin.enums.js';

// ============================================================================
// SCIM 2.0 Core Attributes
// ============================================================================

export interface ScimCoreAttributes {
  /** SCIM userName - unique identifier for authentication */
  username?: string;
  /** External system identifier (HR system, IdP, etc.) */
  externalId?: string;
  /** Formatted display name (e.g., "John Doe") */
  displayName?: string;
  /** Given name / First name */
  givenName?: string;
  /** Family name / Last name */
  familyName?: string;
  /** Native language given name (e.g., 한글 이름) */
  nativeGivenName?: string;
  /** Native language family name */
  nativeFamilyName?: string;
  /** Casual or informal name */
  nickname?: string;
  /** Preferred language code (ISO 639-1) */
  preferredLanguage?: string;
  /** Locale (e.g., "en-US", "ko-KR") */
  locale?: string;
  /** Timezone (IANA tz database) */
  timezone?: string;
  /** Profile URL */
  profileUrl?: string;
  /** Profile photo URL */
  profilePhotoUrl?: string;
}

// ============================================================================
// SCIM 2.0 Enterprise User Attributes
// ============================================================================

export interface ScimEnterpriseAttributes {
  /** Company employee number */
  employeeNumber?: string;
  /** Type of employment */
  employeeType?: EmployeeType;
  /** Current employment status */
  employmentStatus?: EmploymentStatus;
  /** Account lifecycle status (SCIM) */
  lifecycleStatus?: AccountLifecycleStatus;
}

// ============================================================================
// Job & Organization Attributes
// ============================================================================

export interface JobOrganizationAttributes {
  /** Reference to job_grades table */
  jobGradeId?: string;
  /** Job title (localized) */
  jobTitle?: string;
  /** Job title in English */
  jobTitleEn?: string;
  /** Internal job code */
  jobCode?: string;
  /** Job family category */
  jobFamily?: JobFamily;
  /** Reference to organization_units table */
  organizationUnitId?: string;
  /** Cost center code */
  costCenter?: string;
  /** Direct manager admin ID */
  managerAdminId?: string;
  /** Dotted-line / Secondary manager ID */
  dottedLineManagerId?: string;
  /** Count of direct reports */
  directReportsCount?: number;
}

// ============================================================================
// Partner / External Worker Attributes
// ============================================================================

export interface PartnerAttributes {
  /** Reference to partner_companies table */
  partnerCompanyId?: string;
  /** Partner's internal employee ID */
  partnerEmployeeId?: string;
  /** Contract end date for contractors */
  partnerContractEndDate?: Date;
}

// ============================================================================
// JML (Joiner-Mover-Leaver) Lifecycle - Joiner
// ============================================================================

export interface JoinerAttributes {
  /** Official hire date */
  hireDate?: Date;
  /** Original hire date (for rehires) */
  originalHireDate?: Date;
  /** Actual start date */
  startDate?: Date;
  /** Onboarding completion timestamp */
  onboardingCompletedAt?: Date;
  /** Probation period end date */
  probationEndDate?: Date;
  /** Probation status */
  probationStatus?: ProbationStatus;
}

// ============================================================================
// JML Lifecycle - Mover
// ============================================================================

export interface MoverAttributes {
  /** Last role/job change timestamp */
  lastRoleChangeAt?: Date;
  /** Last promotion date */
  lastPromotionDate?: Date;
  /** Last transfer date */
  lastTransferDate?: Date;
}

// ============================================================================
// JML Lifecycle - Leaver
// ============================================================================

export interface LeaverAttributes {
  /** Official termination date */
  terminationDate?: Date;
  /** Last working day */
  lastWorkingDay?: Date;
  /** Reason for termination */
  terminationReason?: string;
  /** Type of termination (voluntary, involuntary, etc.) */
  terminationType?: string;
  /** Eligible for rehire flag */
  eligibleForRehire?: boolean;
  /** Exit interview completion flag */
  exitInterviewCompleted?: boolean;
}

// ============================================================================
// NHI (Non-Human Identity) Attributes
// ============================================================================

export interface NhiAttributes {
  /** Identity type (HUMAN or NHI types) */
  identityType?: IdentityType;
  /** Human owner of this NHI */
  ownerAdminId?: string;
  /** Secondary owner for backup */
  secondaryOwnerId?: string;
  /** Purpose/description of this NHI */
  nhiPurpose?: string;
  /** Service account type */
  serviceAccountType?: ServiceAccountType;
  /** Credential type for this NHI */
  credentialType?: NhiCredentialType;
  /** Secret rotation period in days */
  secretRotationDays?: number;
  /** NHI expiry date */
  nhiExpiryDate?: Date;
  /** Last credential rotation timestamp */
  lastCredentialRotation?: Date;
  /** NHI-specific configuration (JSONB) */
  nhiConfig?: Record<string, any>;
}

// ============================================================================
// Location - Physical
// ============================================================================

export interface PhysicalLocationAttributes {
  /** Reference to legal_entities table */
  legalEntityId?: string;
  /** Reference to offices table */
  primaryOfficeId?: string;
  /** Reference to buildings table */
  buildingId?: string;
  /** Reference to floors table */
  floorId?: string;
  /** Desk/cubicle code */
  deskCode?: string;
  /** Remote work arrangement */
  remoteWorkType?: RemoteWorkType;
}

// ============================================================================
// Location - Tax & Legal
// ============================================================================

export interface TaxLegalLocationAttributes {
  /** Legal entity country (ISO 3166-1 alpha-2) */
  legalCountryCode?: string;
  /** Work location country */
  workCountryCode?: string;
  /** Tax residence country */
  taxResidenceCountry?: string;
  /** Payroll processing country */
  payrollCountryCode?: string;
}

// ============================================================================
// Contact Information
// ============================================================================

export interface ContactAttributes {
  /** Phone number */
  phoneNumber?: string;
  /** Phone country code */
  phoneCountryCode?: string;
  /** Mobile number */
  mobileNumber?: string;
  /** Mobile country code */
  mobileCountryCode?: string;
  /** Work phone number */
  workPhone?: string;
  /** Emergency contact information (JSONB) */
  emergencyContact?: Record<string, any>;
}

// ============================================================================
// Access Control & Security
// ============================================================================

export interface AccessControlAttributes {
  /** Security clearance level */
  securityClearance?: SecurityClearance;
  /** Data access level */
  dataAccessLevel?: DataAccessLevel;
  /** Access expiration date */
  accessEndDate?: Date;
  /** Allowed IP ranges (CIDR notation) */
  allowedIpRanges?: string[];
}

// ============================================================================
// Identity Verification (KYC/AML)
// ============================================================================

export interface IdentityVerificationAttributes {
  /** Identity verified flag */
  identityVerified?: boolean;
  /** Identity verification timestamp */
  identityVerifiedAt?: Date;
  /** Verification method used */
  verificationMethod?: VerificationMethod;
  /** Verification level achieved */
  verificationLevel?: VerificationLevel;
  /** Background check status */
  backgroundCheckStatus?: string;
  /** Background check completion date */
  backgroundCheckDate?: Date;
}

// ============================================================================
// JSONB Extension Attributes
// ============================================================================

/**
 * Admin Skill (HR management context)
 * Different from Resume Skill which is for CV/portfolio display
 */
export interface AdminSkill {
  name: string;
  level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  yearsOfExperience?: number;
  certifiedAt?: Date;
}

/**
 * Admin Certification (HR/compliance tracking)
 */
export interface AdminCertification {
  name: string;
  issuer: string;
  issuedAt?: Date;
  expiresAt?: Date;
  credentialId?: string;
  url?: string;
}

/**
 * Admin Education (HR records)
 * Different from Resume Education which is for CV display
 */
export interface AdminEducation {
  institution: string;
  degree?: string;
  fieldOfStudy?: string;
  startDate?: Date;
  endDate?: Date;
  gpa?: number;
}

/**
 * Admin Work History (HR records)
 */
export interface AdminWorkHistory {
  company: string;
  title: string;
  startDate?: Date;
  endDate?: Date;
  description?: string;
  location?: string;
}

export interface ExtensionAttributes {
  /** Skills (JSONB array) - HR management context */
  skills?: AdminSkill[];
  /** Certifications (JSONB array) - HR/compliance tracking */
  certifications?: AdminCertification[];
  /** Education history (JSONB array) - HR records */
  education?: AdminEducation[];
  /** Work history (JSONB array) - HR records */
  workHistory?: AdminWorkHistory[];
  /** Custom attributes (JSONB object) */
  customAttributes?: Record<string, any>;
  /** User preferences (JSONB object) */
  preferences?: Record<string, any>;
  /** Generic metadata (JSONB object) */
  metadata?: Record<string, any>;
}

// ============================================================================
// Complete Admin Interface
// ============================================================================

/**
 * Admin Entity (Phase 2)
 * Combines all enterprise attributes from SCIM 2.0, JML, and NHI schemas
 */
export interface Admin
  extends
    ScimCoreAttributes,
    ScimEnterpriseAttributes,
    JobOrganizationAttributes,
    PartnerAttributes,
    JoinerAttributes,
    MoverAttributes,
    LeaverAttributes,
    NhiAttributes,
    PhysicalLocationAttributes,
    TaxLegalLocationAttributes,
    ContactAttributes,
    AccessControlAttributes,
    IdentityVerificationAttributes,
    ExtensionAttributes {
  /** Admin ID (UUID as TEXT) */
  id: string;
  /** Email address (unique) */
  email: string;
  /** Hashed password */
  password: string;
  /** Display name */
  name: string;
  /** Admin scope (PLATFORM, TENANT, SERVICE) */
  scope: string;
  /** Tenant ID (for TENANT scope) */
  tenantId?: string;
  /** Parent admin ID (for hierarchy) */
  parentId?: string;
  /** Role ID reference */
  roleId: string;
  /** Active status flag */
  isActive: boolean;
  /** Last login timestamp */
  lastLoginAt?: Date;
  /** Creation timestamp */
  createdAt: Date;
  /** Update timestamp */
  updatedAt: Date;
  /** Account mode (SERVICE, PLATFORM, MULTI_TENANT) */
  accountMode: string;
  /** Country code (ISO 3166-1 alpha-2) */
  countryCode?: string;
  /** Soft delete timestamp */
  deletedAt?: Date;
  /** MFA requirement flag */
  mfaRequired: boolean;
  /** Password last changed timestamp */
  passwordChangedAt?: Date;
  /** Force password change on next login */
  forcePasswordChange: boolean;
  /** Failed login attempt counter */
  failedLoginAttempts: number;
  /** Account locked until timestamp */
  lockedUntil?: Date;
}

/**
 * Admin creation payload (without system-managed fields)
 */
export type CreateAdminPayload = Omit<
  Partial<Admin>,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt'
> & {
  email: string;
  password: string;
  name: string;
  roleId: string;
};

/**
 * Admin update payload (all fields optional except id)
 */
export type UpdateAdminPayload = Partial<Omit<Admin, 'id' | 'createdAt' | 'password'>> & {
  id: string;
};

/**
 * Admin response (without sensitive fields)
 */
export type AdminResponse = Omit<Admin, 'password' | 'failedLoginAttempts' | 'lockedUntil'>;
