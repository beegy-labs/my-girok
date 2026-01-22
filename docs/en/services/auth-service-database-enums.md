# Auth Service Database Enums

> Complete enum definitions used in the auth-service database schema.

## Overview

This document provides a comprehensive reference for all enum types used in the auth-service database. These enums ensure data consistency and provide clear value constraints for various fields.

---

## Identity & Employment

### IdentityType

Defines the type of identity (human or machine).

```
HUMAN, SERVICE_ACCOUNT, BOT, API_CLIENT, INTEGRATION, SYSTEM, EXTERNAL
```

### EmployeeType

Classification of employee relationship.

```
REGULAR, CONTRACT, INTERN, PART_TIME, TEMPORARY, CONSULTANT, PARTNER, VENDOR, FREELANCE
```

### EmploymentStatus

Current employment status.

```
ACTIVE, ON_LEAVE, SUSPENDED, TERMINATED, RETIRED, RESIGNED
```

### AccountLifecycleStatus

Account lifecycle stage.

```
PENDING, ACTIVE, SUSPENDED, DEACTIVATED, ARCHIVED, DELETED
```

---

## Service Accounts

### ServiceAccountType

Type of service account for Non-Human Identities.

```
CI_CD, MONITORING, BACKUP, INTEGRATION, AUTOMATION, TESTING, DATA_PROCESSING, API_SERVICE
```

### NhiCredentialType

Credential type for Non-Human Identities.

```
API_KEY, OAUTH_CLIENT, SERVICE_PRINCIPAL, CERTIFICATE, SSH_KEY, TOKEN
```

---

## Organization

### JobFamily

Functional area classification.

```
ENGINEERING, PRODUCT, DESIGN, MARKETING, SALES, SUPPORT, OPERATIONS, FINANCE, HR, LEGAL, EXECUTIVE
```

### OrgUnitType

Organizational structure type.

```
COMPANY, DIVISION, DEPARTMENT, TEAM, SQUAD, TRIBE, CHAPTER, GUILD
```

### RemoteWorkType

Work location arrangement.

```
OFFICE, REMOTE, HYBRID, FIELD
```

### OfficeType

Physical office classification.

```
HEADQUARTERS, BRANCH, SATELLITE, REMOTE, COWORKING
```

### PartnerType

External partner classification.

```
VENDOR, CONTRACTOR, CONSULTANT, AGENCY, SUPPLIER, PARTNER
```

---

## Access & Security

### SecurityClearance

Security classification level.

```
PUBLIC, INTERNAL, CONFIDENTIAL, SECRET, TOP_SECRET
```

### DataAccessLevel

Data access scope.

```
PUBLIC, TEAM, DEPARTMENT, COMPANY, RESTRICTED, CLASSIFIED
```

### VerificationMethod

Identity verification method.

```
DOCUMENT, BIOMETRIC, VIDEO_CALL, IN_PERSON, THIRD_PARTY, BACKGROUND_CHECK
```

### VerificationLevel

Verification thoroughness level.

```
BASIC, STANDARD, ENHANCED, MAXIMUM
```

---

## Attendance & Leave

### WorkType

Type of work arrangement for attendance.

```
OFFICE, REMOTE, HYBRID, FIELD, BUSINESS_TRIP, CLIENT_SITE, TRAINING
```

### LeaveType

Categories of leave requests.

```
ANNUAL, SICK, PARENTAL, MATERNITY, PATERNITY, BEREAVEMENT, MARRIAGE, UNPAID, COMPENSATORY, PUBLIC_HOLIDAY, SABBATICAL, JURY_DUTY, MILITARY, STUDY, PERSONAL, EMERGENCY
```

### LeaveStatus

Leave request workflow status.

```
DRAFT, PENDING, APPROVED, REJECTED, CANCELLED
```

### ScheduleType

Work schedule classification.

```
STANDARD, SHIFT, FLEXIBLE
```

---

## Delegation & Compliance

### DelegationType

Scope of delegated authority.

```
FULL, PARTIAL, VIEW_ONLY, APPROVAL_ONLY, EMERGENCY
```

### DelegationScope

Resource scope of delegation.

```
ALL, TEAM, DEPARTMENT, SERVICE, SPECIFIC_RESOURCES
```

### DelegationStatus

Delegation lifecycle status.

```
PENDING, ACTIVE, EXPIRED, REVOKED, COMPLETED
```

### DelegationReason

Reason for delegation.

```
VACATION, SICK_LEAVE, BUSINESS_TRIP, PARENTAL_LEAVE, TRAINING, TEMPORARY_ASSIGNMENT, EMERGENCY
```

### AttestationType

Compliance attestation categories.

```
CODE_OF_CONDUCT, SECURITY_POLICY, DATA_PRIVACY, ACCEPTABLE_USE, CONFLICT_OF_INTEREST, INSIDER_TRADING, EXPORT_CONTROL, ANTI_BRIBERY
```

### AttestationStatus

Attestation completion status.

```
PENDING, COMPLETED, WAIVED, EXPIRED
```

### CertificationStatus

Professional certification status.

```
ACTIVE, EXPIRED, SUSPENDED, REVOKED
```

### TrainingType

Training program categories.

```
ONBOARDING, SECURITY, COMPLIANCE, TECHNICAL, SOFT_SKILLS, LEADERSHIP, SAFETY, PRODUCT
```

### TrainingStatus

Training completion status.

```
NOT_STARTED, IN_PROGRESS, COMPLETED, FAILED, WAIVED
```

---

## Global Mobility

### AssignmentType

International assignment classification.

```
INTERNATIONAL, DOMESTIC, SHORT_TERM, LONG_TERM, PERMANENT_TRANSFER, TEMPORARY, ROTATIONAL
```

### AssignmentStatus

Assignment lifecycle status.

```
PLANNED, APPROVED, ACTIVE, COMPLETED, CANCELLED
```

### VisaStatus

Visa application status.

```
NOT_REQUIRED, PENDING, APPROVED, REJECTED, EXPIRED, CANCELLED
```

### WorkPermitType

Work authorization document type.

```
VISA, WORK_PERMIT, RESIDENCE_PERMIT, PERMANENT_RESIDENCE, CITIZENSHIP, EXEMPTION
```

### OrgChangeType

Organization change categories.

```
PROMOTION, DEMOTION, TRANSFER, ROLE_CHANGE, DEPARTMENT_CHANGE, LOCATION_CHANGE, MANAGER_CHANGE, COMPENSATION_CHANGE, JOB_TITLE_CHANGE
```

### OrgChangeStatus

Organization change approval status.

```
PENDING, APPROVED, REJECTED, CANCELLED
```

---

## Prisma Configuration

The auth-service uses Prisma with the following configuration:

```prisma
generator client {
  provider        = "prisma-client-js"
  output          = "../node_modules/.prisma/auth-client"
  previewFeatures = ["relationJoins", "typedSql"]
}
```

---

## Related Documentation

- **Main Schema**: `auth-service-database.md`
- **Service Documentation**: `auth-service.md`

---

_This document is auto-generated from `docs/llm/services/auth-service-database-enums.md`_
