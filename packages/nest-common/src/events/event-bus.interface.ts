/**
 * Event Bus Interface
 *
 * Provides a unified interface for event publishing and subscription
 * across different transport mechanisms (Outbox, Redpanda, etc.)
 */

import type { BaseDomainEvent } from '@my-girok/types';

/**
 * Options for publishing events
 */
export interface PublishOptions {
  /**
   * Delay publishing until transaction commits (Outbox pattern)
   * @default true
   */
  transactional?: boolean;

  /**
   * Topic/channel to publish to
   * If not specified, derived from event type
   */
  topic?: string;

  /**
   * Partition key for ordered delivery
   * If not specified, uses aggregateId
   */
  partitionKey?: string;

  /**
   * Priority for processing order (higher = earlier)
   * @default 0
   */
  priority?: number;

  /**
   * Scheduled publish time (for delayed events)
   */
  scheduledFor?: Date;

  /**
   * Additional headers/metadata for the message
   */
  headers?: Record<string, string>;
}

/**
 * Subscription handler type
 */
export type EventHandler<T extends BaseDomainEvent = BaseDomainEvent> = (event: T) => Promise<void>;

/**
 * Subscription options
 */
export interface SubscribeOptions {
  /**
   * Consumer group ID for load balancing
   */
  groupId?: string;

  /**
   * Number of concurrent handlers
   * @default 1
   */
  concurrency?: number;

  /**
   * Auto-acknowledge after successful processing
   * @default true
   */
  autoAck?: boolean;

  /**
   * Maximum retries on handler failure
   * @default 3
   */
  maxRetries?: number;
}

/**
 * Event subscription handle for cleanup
 */
export interface Subscription {
  /**
   * Unsubscribe from the event stream
   */
  unsubscribe(): Promise<void>;

  /**
   * Check if subscription is active
   */
  isActive(): boolean;
}

/**
 * Event Bus Interface
 *
 * Abstract interface for event publishing and subscription.
 * Implementations can use different backends:
 * - OutboxEventBus: Transactional Outbox pattern with database
 * - RedpandaEventBus: Direct Redpanda/Kafka publishing
 * - InMemoryEventBus: For testing
 *
 * @example
 * ```typescript
 * // Publishing an event
 * await eventBus.publish({
 *   eventId: generateUUIDv7(),
 *   eventType: 'LOGIN_SUCCEEDED',
 *   aggregateType: 'Account',
 *   aggregateId: userId,
 *   timestamp: new Date(),
 *   version: 1,
 *   payload: { sessionId, authMethod: 'PASSWORD' },
 * });
 *
 * // Publishing within a transaction
 * await eventBus.publishInTransaction(tx, event);
 *
 * // Subscribing to events
 * const subscription = await eventBus.subscribe(
 *   'LOGIN_SUCCEEDED',
 *   async (event) => {
 *     await this.auditService.logLogin(event);
 *   },
 *   { groupId: 'audit-service' }
 * );
 * ```
 */
export interface IEventBus {
  /**
   * Publish a single event
   *
   * @param event - The domain event to publish
   * @param options - Publishing options
   * @returns Promise that resolves when event is published/queued
   */
  publish<T extends BaseDomainEvent>(event: T, options?: PublishOptions): Promise<void>;

  /**
   * Publish multiple events atomically
   *
   * @param events - Array of domain events to publish
   * @param options - Publishing options (applied to all events)
   * @returns Promise that resolves when all events are published/queued
   */
  publishBatch<T extends BaseDomainEvent>(events: T[], options?: PublishOptions): Promise<void>;

  /**
   * Publish event within a database transaction (Outbox pattern)
   *
   * The event is stored in the outbox table as part of the same transaction,
   * ensuring atomicity between the domain operation and event publishing.
   *
   * @param tx - Prisma transaction client
   * @param event - The domain event to publish
   * @param options - Publishing options
   * @returns Promise that resolves when event is stored in outbox
   */
  publishInTransaction<T extends BaseDomainEvent>(
    tx: unknown,
    event: T,
    options?: PublishOptions,
  ): Promise<void>;

  /**
   * Publish multiple events within a database transaction
   *
   * @param tx - Prisma transaction client
   * @param events - Array of domain events to publish
   * @param options - Publishing options (applied to all events)
   * @returns Promise that resolves when all events are stored in outbox
   */
  publishBatchInTransaction<T extends BaseDomainEvent>(
    tx: unknown,
    events: T[],
    options?: PublishOptions,
  ): Promise<void>;

  /**
   * Subscribe to events of a specific type
   *
   * @param eventType - Event type to subscribe to (e.g., 'LOGIN_SUCCEEDED')
   * @param handler - Async handler function for the event
   * @param options - Subscription options
   * @returns Subscription handle for cleanup
   */
  subscribe<T extends BaseDomainEvent>(
    eventType: string,
    handler: EventHandler<T>,
    options?: SubscribeOptions,
  ): Promise<Subscription>;

  /**
   * Subscribe to multiple event types with a single handler
   *
   * @param eventTypes - Array of event types to subscribe to
   * @param handler - Async handler function for the events
   * @param options - Subscription options
   * @returns Subscription handle for cleanup
   */
  subscribeMany<T extends BaseDomainEvent>(
    eventTypes: string[],
    handler: EventHandler<T>,
    options?: SubscribeOptions,
  ): Promise<Subscription>;
}

/**
 * Event Bus injection token
 */
export const EVENT_BUS = Symbol('EVENT_BUS');
