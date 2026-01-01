// packages/types/src/admin/sanction.enums.ts

/**
 * Sanction subject type enumeration
 * SSOT: Aligned with packages/proto/auth/v1/auth.proto (SubjectType)
 * Identifies the type of entity being sanctioned
 */
export enum SanctionSubjectType {
  USER = 'USER',
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  /** Service/machine account (Proto: SERVICE) */
  SERVICE = 'SERVICE',
}

/** Proto enum numeric values for SubjectType */
export const SubjectTypeProto = {
  UNSPECIFIED: 0,
  USER: 1,
  OPERATOR: 2,
  SERVICE: 3,
} as const;

/** Map Proto numeric to TypeScript enum */
export const protoToSubjectType: Record<number, SanctionSubjectType> = {
  0: SanctionSubjectType.USER,
  1: SanctionSubjectType.USER,
  2: SanctionSubjectType.OPERATOR,
  3: SanctionSubjectType.SERVICE,
};

/** Map TypeScript enum to Proto numeric */
export const subjectTypeToProto: Record<SanctionSubjectType, number> = {
  [SanctionSubjectType.USER]: SubjectTypeProto.USER,
  [SanctionSubjectType.ADMIN]: SubjectTypeProto.OPERATOR, // ADMIN treated as OPERATOR in Proto
  [SanctionSubjectType.OPERATOR]: SubjectTypeProto.OPERATOR,
  [SanctionSubjectType.SERVICE]: SubjectTypeProto.SERVICE,
};

/**
 * Sanction type enumeration
 * SSOT: Aligned with packages/proto/auth/v1/auth.proto
 * Defines the types of sanctions that can be applied
 */
export enum SanctionType {
  WARNING = 'WARNING',
  /** Temporary communication mute (Proto: MUTE) */
  MUTE = 'MUTE',
  TEMPORARY_BAN = 'TEMPORARY_BAN',
  PERMANENT_BAN = 'PERMANENT_BAN',
  FEATURE_RESTRICTION = 'FEATURE_RESTRICTION',
}

/** Proto enum numeric values for SanctionType */
export const SanctionTypeProto = {
  UNSPECIFIED: 0,
  WARNING: 1,
  MUTE: 2,
  TEMPORARY_BAN: 3,
  PERMANENT_BAN: 4,
  FEATURE_RESTRICTION: 5,
} as const;

/** Map Proto numeric to TypeScript enum */
export const protoToSanctionType: Record<number, SanctionType> = {
  0: SanctionType.WARNING,
  1: SanctionType.WARNING,
  2: SanctionType.MUTE,
  3: SanctionType.TEMPORARY_BAN,
  4: SanctionType.PERMANENT_BAN,
  5: SanctionType.FEATURE_RESTRICTION,
};

/** Map TypeScript enum to Proto numeric */
export const sanctionTypeToProto: Record<SanctionType, number> = {
  [SanctionType.WARNING]: SanctionTypeProto.WARNING,
  [SanctionType.MUTE]: SanctionTypeProto.MUTE,
  [SanctionType.TEMPORARY_BAN]: SanctionTypeProto.TEMPORARY_BAN,
  [SanctionType.PERMANENT_BAN]: SanctionTypeProto.PERMANENT_BAN,
  [SanctionType.FEATURE_RESTRICTION]: SanctionTypeProto.FEATURE_RESTRICTION,
};

/**
 * Sanction status enumeration
 * SSOT: Aligned with packages/proto/auth/v1/auth.proto
 * Tracks the current state of a sanction
 */
export enum SanctionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
  /** Sanction is under appeal review (Proto: APPEALED) */
  APPEALED = 'APPEALED',
}

/** Proto enum numeric values for SanctionStatus */
export const SanctionStatusProto = {
  UNSPECIFIED: 0,
  ACTIVE: 1,
  EXPIRED: 2,
  REVOKED: 3,
  APPEALED: 4,
} as const;

/** Map Proto numeric to TypeScript enum */
export const protoToSanctionStatus: Record<number, SanctionStatus> = {
  0: SanctionStatus.ACTIVE,
  1: SanctionStatus.ACTIVE,
  2: SanctionStatus.EXPIRED,
  3: SanctionStatus.REVOKED,
  4: SanctionStatus.APPEALED,
};

/** Map TypeScript enum to Proto numeric */
export const sanctionStatusToProto: Record<SanctionStatus, number> = {
  [SanctionStatus.ACTIVE]: SanctionStatusProto.ACTIVE,
  [SanctionStatus.EXPIRED]: SanctionStatusProto.EXPIRED,
  [SanctionStatus.REVOKED]: SanctionStatusProto.REVOKED,
  [SanctionStatus.APPEALED]: SanctionStatusProto.APPEALED,
};

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
