/**
 * Legal Service - Domain Events
 * Event types for legal document management and consent compliance
 */

import type { BaseDomainEvent, EventActor } from '../common/index.js';

// Re-export for convenience
export type { EventActor };

// ============================================================================
// Legal Document Events
// ============================================================================

/**
 * Legal document published event
 * Fired when a new legal document version is published
 */
export interface LegalDocumentPublishedEvent extends BaseDomainEvent {
  eventType: 'DOCUMENT_PUBLISHED';
  aggregateType: 'LegalDocument';
  actor?: EventActor;
  payload: {
    /** Document ID */
    documentId: string;
    /** Document type (TERMS_OF_SERVICE, PRIVACY_POLICY, etc.) */
    documentType: string;
    /** Document version */
    version: string;
    /** Country code */
    countryCode: string;
    /** Locale/language code */
    locale: string;
    /** Effective date */
    effectiveFrom: string;
    /** Document title */
    title: string;
    /** Service ID if service-specific */
    serviceId?: string;
    /** Whether re-consent is required */
    requiresReconsent?: boolean;
    /** Previous version if updating */
    previousVersion?: string;
    /** Change summary */
    changeSummary?: string;
  };
}

/**
 * Legal document archived event
 * Fired when a legal document is archived
 */
export interface LegalDocumentArchivedEvent extends BaseDomainEvent {
  eventType: 'LEGAL_DOCUMENT_ARCHIVED';
  aggregateType: 'LegalDocument';
  actor?: EventActor;
  payload: {
    /** Document ID */
    documentId: string;
    /** Document type */
    documentType: string;
    /** Document version */
    version: string;
    /** Service ID if service-specific */
    serviceId?: string;
    /** Reason for archiving */
    reason: 'SUPERSEDED' | 'DEPRECATED' | 'EXPIRED' | 'ADMIN_ACTION';
    /** Replacement document ID if superseded */
    replacedByDocumentId?: string;
    /** Replacement version if superseded */
    replacedByVersion?: string;
  };
}

// ============================================================================
// Consent Events
// ============================================================================

/**
 * Consent granted event
 * Fired when a user grants consent
 */
export interface ConsentGrantedEvent extends BaseDomainEvent {
  eventType: 'CONSENT_GRANTED';
  aggregateType: 'Consent';
  payload: {
    /** Consent record ID */
    consentId: string;
    /** Account ID */
    accountId: string;
    /** Document ID */
    documentId: string;
    /** Document type */
    documentType: string;
    /** Method of consent */
    consentMethod: string;
    /** Consent timestamp */
    consentedAt: string;
    /** Expiration timestamp (optional) */
    expiresAt?: string;
  };
}

/**
 * Consent withdrawn event
 * Fired when a user withdraws consent
 */
export interface ConsentWithdrawnEvent extends BaseDomainEvent {
  eventType: 'CONSENT_WITHDRAWN';
  aggregateType: 'Consent';
  payload: {
    /** Consent record ID */
    consentId: string;
    /** Account ID */
    accountId: string;
    /** Document ID */
    documentId: string;
    /** Document type */
    documentType: string;
    /** Withdrawal timestamp */
    withdrawnAt: string;
    /** Reason for withdrawal */
    reason?: string;
  };
}

/**
 * Consent expired event
 * Fired when a consent record expires and needs renewal
 */
export interface ConsentExpiredEvent extends BaseDomainEvent {
  eventType: 'CONSENT_EXPIRED';
  aggregateType: 'Consent';
  payload: {
    /** Consent record ID */
    consentId: string;
    /** Account ID whose consent expired */
    accountId: string;
    /** Document ID */
    documentId: string;
    /** Document type */
    documentType: string;
    /** Document version the consent was for */
    documentVersion: string;
    /** Original consent timestamp */
    consentedAt: string;
    /** Expiration timestamp */
    expiredAt: string;
    /** Whether account access is affected */
    accessRestricted: boolean;
    /** Service ID if service-specific consent */
    serviceId?: string;
  };
}

/**
 * Consent expiring soon event
 * Fired when a consent will expire within 30 days
 */
export interface ConsentExpiringSoonEvent extends BaseDomainEvent {
  eventType: 'CONSENT_EXPIRING_SOON';
  aggregateType: 'Consent';
  payload: {
    /** Consent record ID */
    consentId: string;
    /** Account ID */
    accountId: string;
    /** Document ID */
    documentId: string;
    /** Document type */
    documentType: string;
    /** Document title */
    documentTitle: string;
    /** Expiration timestamp */
    expiresAt: string;
    /** Days until expiration */
    daysUntilExpiry: number;
  };
}

// ============================================================================
// DSR (Data Subject Request) Events
// ============================================================================

/**
 * DSR request submitted event
 * Fired when a new DSR request is submitted
 */
export interface DsrRequestSubmittedEvent extends BaseDomainEvent {
  eventType: 'DSR_REQUEST_SUBMITTED';
  aggregateType: 'DsrRequest';
  payload: {
    /** Request ID */
    requestId: string;
    /** Account ID */
    accountId: string;
    /** Request type (ACCESS, ERASURE, etc.) */
    requestType: string;
    /** Due date (GDPR: 30 days) */
    dueDate: string;
    /** Request description */
    description?: string;
  };
}

/**
 * DSR request completed event
 * Fired when a DSR request is completed
 */
export interface DsrRequestCompletedEvent extends BaseDomainEvent {
  eventType: 'DSR_REQUEST_COMPLETED';
  aggregateType: 'DsrRequest';
  payload: {
    /** Request ID */
    requestId: string;
    /** Account ID */
    accountId: string;
    /** Request type */
    requestType: string;
    /** Completion status */
    status: 'COMPLETED' | 'REJECTED';
    /** Completion timestamp */
    completedAt: string;
    /** Resolution description */
    resolution?: string;
    /** Rejection reason (if rejected) */
    rejectionReason?: string;
  };
}

/**
 * DSR deadline warning event
 * Fired when a DSR request deadline is approaching
 */
export interface DsrDeadlineWarningEvent extends BaseDomainEvent {
  eventType: 'DSR_DEADLINE_WARNING';
  aggregateType: 'DsrRequest';
  payload: {
    /** Request ID */
    requestId: string;
    /** Account ID */
    accountId: string;
    /** Request type */
    requestType: string;
    /** Due date */
    dueDate: string;
    /** Days remaining */
    daysRemaining: number;
    /** Escalation level */
    escalationLevel: 'WARNING' | 'CRITICAL';
    /** Assigned operator ID */
    assignedTo?: string;
  };
}

/**
 * DSR deadline critical event
 * Fired when a DSR request deadline is within 2 days
 */
export interface DsrDeadlineCriticalEvent extends BaseDomainEvent {
  eventType: 'DSR_DEADLINE_CRITICAL';
  aggregateType: 'DsrRequest';
  payload: {
    /** Request ID */
    requestId: string;
    /** Account ID */
    accountId: string;
    /** Request type */
    requestType: string;
    /** Due date */
    dueDate: string;
    /** Hours remaining */
    hoursRemaining: number;
    /** Escalation level */
    escalationLevel: 'CRITICAL';
    /** Assigned operator ID */
    assignedTo?: string;
  };
}

/**
 * DSR deadline overdue event
 * Fired when a DSR request is past its deadline (GDPR compliance risk)
 */
export interface DsrDeadlineOverdueEvent extends BaseDomainEvent {
  eventType: 'DSR_DEADLINE_OVERDUE';
  aggregateType: 'DsrRequest';
  payload: {
    /** Request ID */
    requestId: string;
    /** Account ID */
    accountId: string;
    /** Request type */
    requestType: string;
    /** Due date */
    dueDate: string;
    /** Days overdue */
    daysOverdue: number;
    /** Escalation level */
    escalationLevel: 'OVERDUE';
    /** Assigned operator ID */
    assignedTo?: string;
  };
}

// ============================================================================
// Event Type Constants
// ============================================================================

/**
 * Legal event type constants for type-safe event handling
 */
export const LEGAL_EVENT_TYPES = {
  // Document events
  DOCUMENT_PUBLISHED: 'DOCUMENT_PUBLISHED',
  LEGAL_DOCUMENT_ARCHIVED: 'LEGAL_DOCUMENT_ARCHIVED',
  // Consent events
  CONSENT_GRANTED: 'CONSENT_GRANTED',
  CONSENT_WITHDRAWN: 'CONSENT_WITHDRAWN',
  CONSENT_EXPIRED: 'CONSENT_EXPIRED',
  CONSENT_EXPIRING_SOON: 'CONSENT_EXPIRING_SOON',
  // DSR events
  DSR_REQUEST_SUBMITTED: 'DSR_REQUEST_SUBMITTED',
  DSR_REQUEST_COMPLETED: 'DSR_REQUEST_COMPLETED',
  DSR_DEADLINE_WARNING: 'DSR_DEADLINE_WARNING',
  DSR_DEADLINE_CRITICAL: 'DSR_DEADLINE_CRITICAL',
  DSR_DEADLINE_OVERDUE: 'DSR_DEADLINE_OVERDUE',
} as const;

export type LegalEventType = (typeof LEGAL_EVENT_TYPES)[keyof typeof LEGAL_EVENT_TYPES];

// ============================================================================
// Union Types
// ============================================================================

/**
 * All legal domain events
 */
export type LegalEvent =
  | LegalDocumentPublishedEvent
  | LegalDocumentArchivedEvent
  | ConsentGrantedEvent
  | ConsentWithdrawnEvent
  | ConsentExpiredEvent
  | ConsentExpiringSoonEvent
  | DsrRequestSubmittedEvent
  | DsrRequestCompletedEvent
  | DsrDeadlineWarningEvent
  | DsrDeadlineCriticalEvent
  | DsrDeadlineOverdueEvent;
