/**
 * Identity Platform - Domain Events
 * Event types for Account, Session, Device, Profile, Auth, Legal domains
 */

// ============================================================================
// Base Event Types
// ============================================================================

/**
 * Base event interface
 * All domain events extend this interface
 */
export interface BaseDomainEvent {
  /** Unique event ID */
  eventId: string;
  /** Event type identifier */
  eventType: string;
  /** Aggregate type (e.g., 'Account', 'Session') */
  aggregateType: string;
  /** Aggregate ID (e.g., accountId, sessionId) */
  aggregateId: string;
  /** Event timestamp */
  timestamp: Date;
  /** Event version for schema evolution */
  version: number;
  /** Correlation ID for request tracing */
  correlationId?: string;
  /** Causation ID (previous event that caused this event) */
  causationId?: string;
  /** Actor who triggered the event */
  actor?: EventActor;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Actor who triggered the event
 */
export interface EventActor {
  id: string;
  type: 'ACCOUNT' | 'OPERATOR' | 'ADMIN' | 'SYSTEM' | 'ANONYMOUS';
  email?: string;
  ipAddress?: string;
  userAgent?: string;
}

// ============================================================================
// Account Events
// ============================================================================

/**
 * Account created event
 */
export interface AccountCreatedEvent extends BaseDomainEvent {
  eventType: 'ACCOUNT_CREATED';
  aggregateType: 'Account';
  payload: {
    email: string;
    provider: string;
    status: string;
  };
}

/**
 * Account updated event
 */
export interface AccountUpdatedEvent extends BaseDomainEvent {
  eventType: 'ACCOUNT_UPDATED';
  aggregateType: 'Account';
  payload: {
    changes: Record<string, { from: unknown; to: unknown }>;
  };
}

/**
 * Account deleted event
 */
export interface AccountDeletedEvent extends BaseDomainEvent {
  eventType: 'ACCOUNT_DELETED';
  aggregateType: 'Account';
  payload: {
    deletionReason?: string;
    hardDelete: boolean;
  };
}

/**
 * Email verified event
 */
export interface EmailVerifiedEvent extends BaseDomainEvent {
  eventType: 'EMAIL_VERIFIED';
  aggregateType: 'Account';
  payload: {
    email: string;
  };
}

/**
 * Phone verified event
 */
export interface PhoneVerifiedEvent extends BaseDomainEvent {
  eventType: 'PHONE_VERIFIED';
  aggregateType: 'Account';
  payload: {
    phoneNumber: string;
  };
}

/**
 * MFA enabled event
 */
export interface MfaEnabledEvent extends BaseDomainEvent {
  eventType: 'MFA_ENABLED';
  aggregateType: 'Account';
  payload: {
    method: string;
  };
}

/**
 * MFA disabled event
 */
export interface MfaDisabledEvent extends BaseDomainEvent {
  eventType: 'MFA_DISABLED';
  aggregateType: 'Account';
  payload: {
    previousMethod: string;
  };
}

/**
 * Password changed event
 */
export interface PasswordChangedEvent extends BaseDomainEvent {
  eventType: 'PASSWORD_CHANGED';
  aggregateType: 'Account';
  payload: {
    requireReauth: boolean;
  };
}

/**
 * Account locked event
 */
export interface AccountLockedEvent extends BaseDomainEvent {
  eventType: 'ACCOUNT_LOCKED';
  aggregateType: 'Account';
  payload: {
    reason: string;
    lockedUntil: Date | null;
    failedAttempts: number;
  };
}

/**
 * Account unlocked event
 */
export interface AccountUnlockedEvent extends BaseDomainEvent {
  eventType: 'ACCOUNT_UNLOCKED';
  aggregateType: 'Account';
  payload: {
    unlockedBy: string;
  };
}

// ============================================================================
// Session Events
// ============================================================================

/**
 * Session started event
 */
export interface SessionStartedEvent extends BaseDomainEvent {
  eventType: 'SESSION_STARTED';
  aggregateType: 'Session';
  payload: {
    accountId: string;
    deviceId: string | null;
    ipAddress: string;
    userAgent: string;
    location: string | null;
  };
}

/**
 * Session refreshed event
 */
export interface SessionRefreshedEvent extends BaseDomainEvent {
  eventType: 'SESSION_REFRESHED';
  aggregateType: 'Session';
  payload: {
    accountId: string;
    previousExpiresAt: Date;
    newExpiresAt: Date;
  };
}

/**
 * Session ended event
 */
export interface SessionEndedEvent extends BaseDomainEvent {
  eventType: 'SESSION_ENDED';
  aggregateType: 'Session';
  payload: {
    accountId: string;
    reason: 'LOGOUT' | 'EXPIRED' | 'REVOKED' | 'FORCED';
  };
}

/**
 * All sessions revoked event
 */
export interface AllSessionsRevokedEvent extends BaseDomainEvent {
  eventType: 'ALL_SESSIONS_REVOKED';
  aggregateType: 'Account';
  payload: {
    revokedCount: number;
    excludedSessionId: string | null;
    reason: string;
  };
}

// ============================================================================
// Device Events
// ============================================================================

/**
 * Device registered event
 */
export interface DeviceRegisteredEvent extends BaseDomainEvent {
  eventType: 'DEVICE_REGISTERED';
  aggregateType: 'Device';
  payload: {
    accountId: string;
    deviceType: string;
    deviceName: string;
    platform: string | null;
  };
}

/**
 * Device trusted event
 */
export interface DeviceTrustedEvent extends BaseDomainEvent {
  eventType: 'DEVICE_TRUSTED';
  aggregateType: 'Device';
  payload: {
    accountId: string;
    previousTrustLevel: string;
  };
}

/**
 * Device untrusted event
 */
export interface DeviceUntrustedEvent extends BaseDomainEvent {
  eventType: 'DEVICE_UNTRUSTED';
  aggregateType: 'Device';
  payload: {
    accountId: string;
    reason: string;
  };
}

/**
 * Device removed event
 */
export interface DeviceRemovedEvent extends BaseDomainEvent {
  eventType: 'DEVICE_REMOVED';
  aggregateType: 'Device';
  payload: {
    accountId: string;
    deviceType: string;
  };
}

// ============================================================================
// Profile Events
// ============================================================================

/**
 * Profile created event
 */
export interface ProfileCreatedEvent extends BaseDomainEvent {
  eventType: 'PROFILE_CREATED';
  aggregateType: 'Profile';
  payload: {
    accountId: string;
    displayName: string;
    visibility: string;
  };
}

/**
 * Profile updated event
 */
export interface ProfileUpdatedEvent extends BaseDomainEvent {
  eventType: 'PROFILE_UPDATED';
  aggregateType: 'Profile';
  payload: {
    accountId: string;
    changes: Record<string, { from: unknown; to: unknown }>;
  };
}

/**
 * Avatar updated event
 */
export interface AvatarUpdatedEvent extends BaseDomainEvent {
  eventType: 'AVATAR_UPDATED';
  aggregateType: 'Profile';
  payload: {
    accountId: string;
    previousAvatarUrl: string | null;
    newAvatarUrl: string;
  };
}

// ============================================================================
// Authorization Events
// ============================================================================

/**
 * Role assigned event
 */
export interface RoleAssignedEvent extends BaseDomainEvent {
  eventType: 'ROLE_ASSIGNED';
  aggregateType: 'Account';
  payload: {
    roleId: string;
    roleName: string;
    serviceId: string | null;
    tenantId: string | null;
    expiresAt: Date | null;
  };
}

/**
 * Role revoked event
 */
export interface RoleRevokedEvent extends BaseDomainEvent {
  eventType: 'ROLE_REVOKED';
  aggregateType: 'Account';
  payload: {
    roleId: string;
    roleName: string;
    serviceId: string | null;
    tenantId: string | null;
    reason: string;
  };
}

/**
 * Permission granted event
 */
export interface PermissionGrantedEvent extends BaseDomainEvent {
  eventType: 'PERMISSION_GRANTED';
  aggregateType: 'Role';
  payload: {
    permissionId: string;
    resource: string;
    action: string;
  };
}

/**
 * Permission revoked event
 */
export interface PermissionRevokedEvent extends BaseDomainEvent {
  eventType: 'PERMISSION_REVOKED';
  aggregateType: 'Role';
  payload: {
    permissionId: string;
    resource: string;
    action: string;
    reason: string;
  };
}

// ============================================================================
// Sanction Events
// ============================================================================

/**
 * Sanction applied event
 */
export interface SanctionAppliedEvent extends BaseDomainEvent {
  eventType: 'SANCTION_APPLIED';
  aggregateType: 'Sanction';
  payload: {
    subjectId: string;
    subjectType: string;
    sanctionType: string;
    severity: string;
    reason: string;
    startAt: Date;
    endAt: Date | null;
  };
}

/**
 * Sanction revoked event
 */
export interface SanctionRevokedEvent extends BaseDomainEvent {
  eventType: 'SANCTION_REVOKED';
  aggregateType: 'Sanction';
  payload: {
    subjectId: string;
    revokedBy: string;
    reason: string;
  };
}

/**
 * Sanction extended event
 */
export interface SanctionExtendedEvent extends BaseDomainEvent {
  eventType: 'SANCTION_EXTENDED';
  aggregateType: 'Sanction';
  payload: {
    subjectId: string;
    previousEndAt: Date | null;
    newEndAt: Date;
    reason: string;
  };
}

/**
 * Sanction appeal submitted event
 */
export interface SanctionAppealSubmittedEvent extends BaseDomainEvent {
  eventType: 'SANCTION_APPEAL_SUBMITTED';
  aggregateType: 'Sanction';
  payload: {
    subjectId: string;
    appealReason: string;
  };
}

/**
 * Sanction appeal reviewed event
 */
export interface SanctionAppealReviewedEvent extends BaseDomainEvent {
  eventType: 'SANCTION_APPEAL_REVIEWED';
  aggregateType: 'Sanction';
  payload: {
    subjectId: string;
    reviewedBy: string;
    decision: 'APPROVED' | 'REJECTED' | 'ESCALATED';
    response: string;
  };
}

// ============================================================================
// Consent Events
// ============================================================================

/**
 * Consent granted event
 */
export interface ConsentGrantedEvent extends BaseDomainEvent {
  eventType: 'CONSENT_GRANTED';
  aggregateType: 'Consent';
  payload: {
    accountId: string;
    consentType: string;
    documentVersion: string | null;
    source: string;
  };
}

/**
 * Consent withdrawn event
 */
export interface ConsentWithdrawnEvent extends BaseDomainEvent {
  eventType: 'CONSENT_WITHDRAWN';
  aggregateType: 'Consent';
  payload: {
    accountId: string;
    consentType: string;
    reason: string | null;
  };
}

// ============================================================================
// DSR Events
// ============================================================================

/**
 * DSR request submitted event
 */
export interface DSRRequestSubmittedEvent extends BaseDomainEvent {
  eventType: 'DSR_REQUEST_SUBMITTED';
  aggregateType: 'DSRRequest';
  payload: {
    accountId: string;
    requestType: string;
    dueAt: Date;
  };
}

/**
 * DSR request processed event
 */
export interface DSRRequestProcessedEvent extends BaseDomainEvent {
  eventType: 'DSR_REQUEST_PROCESSED';
  aggregateType: 'DSRRequest';
  payload: {
    accountId: string;
    requestType: string;
    status: string;
    processedBy: string;
  };
}

/**
 * DSR request completed event
 */
export interface DSRRequestCompletedEvent extends BaseDomainEvent {
  eventType: 'DSR_REQUEST_COMPLETED';
  aggregateType: 'DSRRequest';
  payload: {
    accountId: string;
    requestType: string;
    downloadUrl: string | null;
  };
}

// ============================================================================
// Union Types
// ============================================================================

/**
 * All account-related events
 */
export type AccountEvent =
  | AccountCreatedEvent
  | AccountUpdatedEvent
  | AccountDeletedEvent
  | EmailVerifiedEvent
  | PhoneVerifiedEvent
  | MfaEnabledEvent
  | MfaDisabledEvent
  | PasswordChangedEvent
  | AccountLockedEvent
  | AccountUnlockedEvent
  | AllSessionsRevokedEvent
  | RoleAssignedEvent
  | RoleRevokedEvent;

/**
 * All session-related events
 */
export type SessionEvent = SessionStartedEvent | SessionRefreshedEvent | SessionEndedEvent;

/**
 * All device-related events
 */
export type DeviceEvent =
  | DeviceRegisteredEvent
  | DeviceTrustedEvent
  | DeviceUntrustedEvent
  | DeviceRemovedEvent;

/**
 * All profile-related events
 */
export type ProfileEvent = ProfileCreatedEvent | ProfileUpdatedEvent | AvatarUpdatedEvent;

/**
 * All authorization-related events
 */
export type AuthorizationEvent =
  | RoleAssignedEvent
  | RoleRevokedEvent
  | PermissionGrantedEvent
  | PermissionRevokedEvent;

/**
 * All sanction-related events
 */
export type SanctionEvent =
  | SanctionAppliedEvent
  | SanctionRevokedEvent
  | SanctionExtendedEvent
  | SanctionAppealSubmittedEvent
  | SanctionAppealReviewedEvent;

/**
 * All consent-related events
 */
export type ConsentEvent = ConsentGrantedEvent | ConsentWithdrawnEvent;

/**
 * All DSR-related events
 */
export type DSREvent =
  | DSRRequestSubmittedEvent
  | DSRRequestProcessedEvent
  | DSRRequestCompletedEvent;

/**
 * All Identity Platform domain events
 */
export type IdentityDomainEvent =
  | AccountEvent
  | SessionEvent
  | DeviceEvent
  | ProfileEvent
  | AuthorizationEvent
  | SanctionEvent
  | ConsentEvent
  | DSREvent;

// ============================================================================
// Event Type Constants
// ============================================================================

/**
 * Event type constants for type-safe event handling
 */
export const IdentityEventTypes = {
  // Account
  ACCOUNT_CREATED: 'ACCOUNT_CREATED',
  ACCOUNT_UPDATED: 'ACCOUNT_UPDATED',
  ACCOUNT_DELETED: 'ACCOUNT_DELETED',
  EMAIL_VERIFIED: 'EMAIL_VERIFIED',
  PHONE_VERIFIED: 'PHONE_VERIFIED',
  MFA_ENABLED: 'MFA_ENABLED',
  MFA_DISABLED: 'MFA_DISABLED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED: 'ACCOUNT_UNLOCKED',

  // Session
  SESSION_STARTED: 'SESSION_STARTED',
  SESSION_REFRESHED: 'SESSION_REFRESHED',
  SESSION_ENDED: 'SESSION_ENDED',
  ALL_SESSIONS_REVOKED: 'ALL_SESSIONS_REVOKED',

  // Device
  DEVICE_REGISTERED: 'DEVICE_REGISTERED',
  DEVICE_TRUSTED: 'DEVICE_TRUSTED',
  DEVICE_UNTRUSTED: 'DEVICE_UNTRUSTED',
  DEVICE_REMOVED: 'DEVICE_REMOVED',

  // Profile
  PROFILE_CREATED: 'PROFILE_CREATED',
  PROFILE_UPDATED: 'PROFILE_UPDATED',
  AVATAR_UPDATED: 'AVATAR_UPDATED',

  // Authorization
  ROLE_ASSIGNED: 'ROLE_ASSIGNED',
  ROLE_REVOKED: 'ROLE_REVOKED',
  PERMISSION_GRANTED: 'PERMISSION_GRANTED',
  PERMISSION_REVOKED: 'PERMISSION_REVOKED',

  // Sanction
  SANCTION_APPLIED: 'SANCTION_APPLIED',
  SANCTION_REVOKED: 'SANCTION_REVOKED',
  SANCTION_EXTENDED: 'SANCTION_EXTENDED',
  SANCTION_APPEAL_SUBMITTED: 'SANCTION_APPEAL_SUBMITTED',
  SANCTION_APPEAL_REVIEWED: 'SANCTION_APPEAL_REVIEWED',

  // Consent
  CONSENT_GRANTED: 'CONSENT_GRANTED',
  CONSENT_WITHDRAWN: 'CONSENT_WITHDRAWN',

  // DSR
  DSR_REQUEST_SUBMITTED: 'DSR_REQUEST_SUBMITTED',
  DSR_REQUEST_PROCESSED: 'DSR_REQUEST_PROCESSED',
  DSR_REQUEST_COMPLETED: 'DSR_REQUEST_COMPLETED',
} as const;

export type IdentityEventType = (typeof IdentityEventTypes)[keyof typeof IdentityEventTypes];
