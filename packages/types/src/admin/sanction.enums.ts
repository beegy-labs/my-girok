// packages/types/src/admin/sanction.enums.ts

/**
 * Sanction subject type enumeration
 * Identifies the type of entity being sanctioned
 */
export enum SanctionSubjectType {
  USER = 'USER',
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
}

/**
 * Sanction type enumeration
 * Defines the types of sanctions that can be applied
 */
export enum SanctionType {
  WARNING = 'WARNING',
  TEMPORARY_BAN = 'TEMPORARY_BAN',
  PERMANENT_BAN = 'PERMANENT_BAN',
  FEATURE_RESTRICTION = 'FEATURE_RESTRICTION',
}

/**
 * Sanction status enumeration
 * Tracks the current state of a sanction
 */
export enum SanctionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

/**
 * Sanction scope enumeration
 * Defines the scope at which a sanction applies
 */
export enum SanctionScope {
  PLATFORM = 'PLATFORM',
  SERVICE = 'SERVICE',
}

/**
 * Sanction severity enumeration
 * Indicates the severity level of a sanction
 */
export enum SanctionSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Appeal status enumeration
 * Tracks the status of sanction appeals
 */
export enum AppealStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ESCALATED = 'ESCALATED',
}

/**
 * Notification channel enumeration
 * Defines channels for sanction notifications
 */
export enum NotificationChannel {
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  SMS = 'SMS',
  IN_APP = 'IN_APP',
}

/**
 * Notification status enumeration
 * Tracks the delivery status of notifications
 */
export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
}
