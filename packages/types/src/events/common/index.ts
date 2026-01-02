/**
 * Common Event Types
 * Shared base types for all domain events
 */

// ============================================================================
// Base Event Types
// ============================================================================

/**
 * Base event interface
 * All domain events extend this interface
 */
export interface BaseDomainEvent {
  /** Unique event ID (UUIDv7) */
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
 * Used for security audit and compliance tracking
 */
export interface EventActor {
  /** Actor's unique identifier */
  id: string;
  /** Type of actor */
  type: 'ACCOUNT' | 'OPERATOR' | 'ADMIN' | 'SYSTEM' | 'ANONYMOUS';
  /** Actor's email (masked for PII compliance) */
  email?: string;
  /** IP address of the request */
  ipAddress?: string;
  /** User agent string */
  userAgent?: string;
}
