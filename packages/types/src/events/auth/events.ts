/**
 * Auth Service - Domain Events
 * Event types for security audit and compliance logging
 */

import type { BaseDomainEvent, EventActor } from '../common/index.js';

// Re-export for convenience
export type { EventActor };

// ============================================================================
// Password Events
// ============================================================================

/**
 * Password reset requested event
 * Fired when a user requests a password reset
 */
export interface PasswordResetRequestedEvent extends BaseDomainEvent {
  eventType: 'PASSWORD_RESET_REQUESTED';
  aggregateType: 'Account';
  actor: EventActor;
  payload: {
    /** Email address for password reset (masked) */
    email: string;
    /** Reset token expiration time */
    expiresAt: Date;
    /** Request source (web, mobile, api) */
    source: string;
  };
}

/**
 * Password reset completed event
 * Fired when a password reset is successfully completed
 */
export interface PasswordResetCompletedEvent extends BaseDomainEvent {
  eventType: 'PASSWORD_RESET_COMPLETED';
  aggregateType: 'Account';
  actor: EventActor;
  payload: {
    /** Whether re-authentication is required on other sessions */
    requireReauth: boolean;
    /** Number of sessions invalidated */
    sessionsInvalidated: number;
  };
}

// ============================================================================
// Login Events
// ============================================================================

/**
 * Login failed event
 * Fired when a login attempt fails
 */
export interface LoginFailedEvent extends BaseDomainEvent {
  eventType: 'LOGIN_FAILED';
  aggregateType: 'Account';
  actor: EventActor;
  payload: {
    /** Email address used for login attempt (masked) */
    email: string;
    /** Reason for failure */
    reason:
      | 'INVALID_CREDENTIALS'
      | 'ACCOUNT_LOCKED'
      | 'ACCOUNT_DISABLED'
      | 'MFA_REQUIRED'
      | 'MFA_FAILED'
      | 'RATE_LIMITED';
    /** Current failed attempt count */
    attemptCount: number;
    /** Whether account is now locked */
    accountLocked: boolean;
    /** Lock expiration time if locked */
    lockExpiresAt?: Date;
  };
}

/**
 * Login succeeded event
 * Fired when a login is successful
 */
export interface LoginSucceededEvent extends BaseDomainEvent {
  eventType: 'LOGIN_SUCCEEDED';
  aggregateType: 'Account';
  actor: EventActor;
  payload: {
    /** Session ID created for this login */
    sessionId: string;
    /** Authentication method used */
    authMethod: 'PASSWORD' | 'OAUTH' | 'SSO' | 'MFA' | 'PASSKEY';
    /** OAuth provider if applicable */
    provider?: string;
    /** Device ID if known */
    deviceId?: string;
    /** Whether this is a new device */
    isNewDevice: boolean;
    /** Location information */
    location?: string;
  };
}

// ============================================================================
// Token Events
// ============================================================================

/**
 * Token revoked event
 * Fired when a token is manually or automatically revoked
 */
export interface TokenRevokedEvent extends BaseDomainEvent {
  eventType: 'TOKEN_REVOKED';
  aggregateType: 'Session';
  actor: EventActor;
  payload: {
    /** Type of token revoked */
    tokenType: 'ACCESS' | 'REFRESH' | 'ALL';
    /** Session ID associated with the token */
    sessionId: string;
    /** Reason for revocation */
    reason:
      | 'LOGOUT'
      | 'PASSWORD_CHANGED'
      | 'SECURITY_CONCERN'
      | 'ADMIN_ACTION'
      | 'EXPIRED'
      | 'USER_REQUEST';
    /** Whether all sessions were revoked */
    allSessionsRevoked: boolean;
  };
}

// ============================================================================
// Contact Information Events
// ============================================================================

/**
 * Email changed event
 * Fired when a user's email address is changed
 */
export interface EmailChangedEvent extends BaseDomainEvent {
  eventType: 'EMAIL_CHANGED';
  aggregateType: 'Account';
  actor: EventActor;
  payload: {
    /** Previous email address (masked) */
    previousEmail: string;
    /** New email address (masked) */
    newEmail: string;
    /** Whether verification is required */
    verificationRequired: boolean;
    /** Verification sent timestamp */
    verificationSentAt?: Date;
  };
}

/**
 * Phone changed event
 * Fired when a user's phone number is changed
 */
export interface PhoneChangedEvent extends BaseDomainEvent {
  eventType: 'PHONE_CHANGED';
  aggregateType: 'Account';
  actor: EventActor;
  payload: {
    /** Previous phone number (masked) */
    previousPhone?: string;
    /** New phone number (masked) */
    newPhone: string;
    /** Whether verification is required */
    verificationRequired: boolean;
    /** Verification sent timestamp */
    verificationSentAt?: Date;
  };
}

// ============================================================================
// Role Events - Re-exported from identity events (SSOT)
// ============================================================================
// Note: RoleAssignedEvent and RoleRevokedEvent are defined in identity/events.ts
// and re-exported here for auth domain convenience.
// Import them from '@my-girok/types/events' or '@my-girok/types/events/identity'

// ============================================================================
// Event Type Constants
// ============================================================================

/**
 * Auth event type constants for type-safe event handling
 */
export const AUTH_EVENT_TYPES = {
  PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED: 'PASSWORD_RESET_COMPLETED',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGIN_SUCCEEDED: 'LOGIN_SUCCEEDED',
  TOKEN_REVOKED: 'TOKEN_REVOKED',
  EMAIL_CHANGED: 'EMAIL_CHANGED',
  PHONE_CHANGED: 'PHONE_CHANGED',
} as const;

export type AuthEventType = (typeof AUTH_EVENT_TYPES)[keyof typeof AUTH_EVENT_TYPES];

// ============================================================================
// Union Types
// ============================================================================

/**
 * All auth domain events
 * Note: RoleAssignedEvent and RoleRevokedEvent are part of IdentityDomainEvent
 */
export type AuthEvent =
  | PasswordResetRequestedEvent
  | PasswordResetCompletedEvent
  | LoginFailedEvent
  | LoginSucceededEvent
  | TokenRevokedEvent
  | EmailChangedEvent
  | PhoneChangedEvent;
