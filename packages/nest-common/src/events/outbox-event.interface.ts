/**
 * Outbox Event Interface
 *
 * Types for the Transactional Outbox pattern implementation.
 * Events are stored in a database table and published asynchronously
 * to ensure atomicity between domain operations and event publishing.
 */

/**
 * Outbox event status
 */
export enum OutboxStatus {
  /** Event is pending, waiting to be published */
  PENDING = 'PENDING',
  /** Event is currently being processed */
  PROCESSING = 'PROCESSING',
  /** Event has been successfully published */
  PUBLISHED = 'PUBLISHED',
  /** Event publishing failed after max retries */
  FAILED = 'FAILED',
  /** Event has been archived (for cleanup) */
  ARCHIVED = 'ARCHIVED',
}

/**
 * Outbox event record stored in the database
 *
 * This represents the structure of an event in the outbox table.
 * Events are written to this table atomically with domain operations
 * and then published asynchronously by the OutboxPublisher.
 *
 * @example
 * ```typescript
 * // Example outbox event record
 * const outboxEvent: OutboxEvent = {
 *   id: '019123ab-cdef-7abc-def0-123456789abc',
 *   eventType: 'LOGIN_SUCCEEDED',
 *   aggregateType: 'Account',
 *   aggregateId: '019123ab-cdef-7abc-def0-123456789abd',
 *   topic: 'auth.events',
 *   partitionKey: '019123ab-cdef-7abc-def0-123456789abd',
 *   payload: {
 *     eventId: '...',
 *     eventType: 'LOGIN_SUCCEEDED',
 *     // ... full event data
 *   },
 *   status: OutboxStatus.PENDING,
 *   priority: 0,
 *   retryCount: 0,
 *   maxRetries: 5,
 *   createdAt: new Date('2025-01-01T00:00:00Z'),
 *   scheduledFor: null,
 *   processedAt: null,
 *   error: null,
 * };
 * ```
 */
export interface OutboxEvent {
  /** Unique outbox event ID (UUIDv7) */
  id: string;

  /** Domain event type (e.g., 'LOGIN_SUCCEEDED') */
  eventType: string;

  /** Aggregate type (e.g., 'Account', 'Session') */
  aggregateType: string;

  /** Aggregate ID for the event */
  aggregateId: string;

  /** Target topic/channel for publishing */
  topic: string;

  /** Partition key for ordered delivery */
  partitionKey: string;

  /** Serialized event payload (JSON) */
  payload: Record<string, unknown>;

  /** Current status of the outbox event */
  status: OutboxStatus;

  /** Priority for processing order (higher = earlier) */
  priority: number;

  /** Number of publish retry attempts */
  retryCount: number;

  /** Maximum retry attempts before marking as failed */
  maxRetries: number;

  /** Headers/metadata for the message */
  headers?: Record<string, string>;

  /** Timestamp when the event was created */
  createdAt: Date;

  /** Scheduled time for delayed publishing */
  scheduledFor: Date | null;

  /** Timestamp when the event was successfully published */
  processedAt: Date | null;

  /** Last error message if publishing failed */
  error: string | null;

  /** Correlation ID for request tracing */
  correlationId?: string;

  /** Causation ID (event that caused this event) */
  causationId?: string;
}

/**
 * Input for creating a new outbox event
 */
export interface CreateOutboxEventInput {
  /** Domain event type */
  eventType: string;

  /** Aggregate type */
  aggregateType: string;

  /** Aggregate ID */
  aggregateId: string;

  /** Target topic (optional, derived from eventType if not provided) */
  topic?: string;

  /** Partition key (optional, uses aggregateId if not provided) */
  partitionKey?: string;

  /** Event payload */
  payload: Record<string, unknown>;

  /** Priority (default: 0) */
  priority?: number;

  /** Max retries (default: 5) */
  maxRetries?: number;

  /** Headers/metadata */
  headers?: Record<string, string>;

  /** Scheduled publish time */
  scheduledFor?: Date;

  /** Correlation ID */
  correlationId?: string;

  /** Causation ID */
  causationId?: string;
}

/**
 * Result of processing outbox events
 */
export interface OutboxProcessingResult {
  /** Number of events successfully published */
  published: number;

  /** Number of events that failed */
  failed: number;

  /** Number of events skipped (not ready, etc.) */
  skipped: number;

  /** Total processing time in milliseconds */
  durationMs: number;

  /** Error details for failed events */
  errors: Array<{
    eventId: string;
    error: string;
  }>;
}
