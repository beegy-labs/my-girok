/**
 * Outbox Service
 *
 * Abstract service for managing outbox events.
 * Concrete implementations provide database-specific operations.
 */

import { Logger } from '@nestjs/common';
import type { BaseDomainEvent } from '@my-girok/types';
import type {
  OutboxEvent,
  CreateOutboxEventInput,
  OutboxProcessingResult,
} from './outbox-event.interface';
import { OutboxStatus } from './outbox-event.interface';

/**
 * Query options for fetching outbox events
 */
export interface OutboxQueryOptions {
  /** Filter by status */
  status?: OutboxStatus | OutboxStatus[];

  /** Filter by event types */
  eventTypes?: string[];

  /** Filter by aggregate type */
  aggregateType?: string;

  /** Maximum number of events to fetch */
  limit?: number;

  /** Only fetch events scheduled before this time */
  scheduledBefore?: Date;

  /** Order by priority (descending) */
  orderByPriority?: boolean;

  /** Lock events for processing (SELECT FOR UPDATE SKIP LOCKED) */
  forUpdate?: boolean;
}

/**
 * Abstract Outbox Service
 *
 * Provides the interface for outbox event management.
 * Implementations must provide database-specific operations for:
 * - Creating outbox events within transactions
 * - Fetching pending events for processing
 * - Updating event status after processing
 * - Cleaning up old events
 *
 * @example
 * ```typescript
 * // Concrete implementation
 * @Injectable()
 * export class PrismaOutboxService extends OutboxService {
 *   constructor(private readonly prisma: PrismaService) {
 *     super();
 *   }
 *
 *   async createEvent(tx: unknown, input: CreateOutboxEventInput): Promise<OutboxEvent> {
 *     const prismaClient = tx as PrismaTransactionClient;
 *     return prismaClient.outboxEvent.create({
 *       data: this.mapInputToData(input),
 *     });
 *   }
 *
 *   // ... other implementations
 * }
 * ```
 */
export abstract class OutboxService {
  protected readonly logger = new Logger(this.constructor.name);

  /**
   * Create a new outbox event within a transaction
   *
   * This method is called within the same database transaction as the
   * domain operation, ensuring atomicity.
   *
   * @param tx - Database transaction client
   * @param input - Event creation input
   * @returns The created outbox event
   */
  abstract createEvent(tx: unknown, input: CreateOutboxEventInput): Promise<OutboxEvent>;

  /**
   * Create multiple outbox events within a transaction
   *
   * @param tx - Database transaction client
   * @param inputs - Array of event creation inputs
   * @returns Array of created outbox events
   */
  abstract createEvents(tx: unknown, inputs: CreateOutboxEventInput[]): Promise<OutboxEvent[]>;

  /**
   * Fetch pending events for processing
   *
   * Should use SELECT FOR UPDATE SKIP LOCKED to prevent concurrent
   * processing of the same events.
   *
   * @param options - Query options
   * @returns Array of outbox events ready for processing
   */
  abstract fetchPendingEvents(options?: OutboxQueryOptions): Promise<OutboxEvent[]>;

  /**
   * Mark event as processing (in-flight)
   *
   * @param eventId - Outbox event ID
   * @returns Updated outbox event
   */
  abstract markAsProcessing(eventId: string): Promise<OutboxEvent>;

  /**
   * Mark event as successfully published
   *
   * @param eventId - Outbox event ID
   * @returns Updated outbox event
   */
  abstract markAsPublished(eventId: string): Promise<OutboxEvent>;

  /**
   * Mark event as failed
   *
   * @param eventId - Outbox event ID
   * @param error - Error message
   * @returns Updated outbox event
   */
  abstract markAsFailed(eventId: string, error: string): Promise<OutboxEvent>;

  /**
   * Increment retry count and optionally mark as failed if max retries reached
   *
   * @param eventId - Outbox event ID
   * @param error - Error message
   * @returns Updated outbox event with incremented retry count
   */
  abstract incrementRetry(eventId: string, error: string): Promise<OutboxEvent>;

  /**
   * Archive old published events
   *
   * @param olderThan - Archive events published before this date
   * @returns Number of archived events
   */
  abstract archiveOldEvents(olderThan: Date): Promise<number>;

  /**
   * Delete archived events (permanent cleanup)
   *
   * @param olderThan - Delete events archived before this date
   * @returns Number of deleted events
   */
  abstract deleteArchivedEvents(olderThan: Date): Promise<number>;

  /**
   * Get outbox statistics for monitoring
   *
   * @returns Statistics about outbox event counts by status
   */
  abstract getStatistics(): Promise<{
    pending: number;
    processing: number;
    published: number;
    failed: number;
    archived: number;
    total: number;
  }>;

  /**
   * Recover stuck events (events in PROCESSING state for too long)
   *
   * @param stuckThreshold - Events processing longer than this (in ms) are considered stuck
   * @returns Number of recovered events
   */
  abstract recoverStuckEvents(stuckThreshold: number): Promise<number>;

  // ============================================================================
  // Helper Methods (can be overridden if needed)
  // ============================================================================

  /**
   * Convert a domain event to outbox input
   *
   * @param event - Domain event
   * @param options - Additional options
   * @returns Outbox event creation input
   */
  protected eventToOutboxInput(
    event: BaseDomainEvent,
    options: {
      topic?: string;
      partitionKey?: string;
      priority?: number;
      maxRetries?: number;
      headers?: Record<string, string>;
      scheduledFor?: Date;
    } = {},
  ): CreateOutboxEventInput {
    return {
      eventType: event.eventType,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      topic: options.topic ?? this.deriveTopicFromEventType(event.eventType),
      partitionKey: options.partitionKey ?? event.aggregateId,
      payload: event as unknown as Record<string, unknown>,
      priority: options.priority ?? 0,
      maxRetries: options.maxRetries ?? 5,
      headers: options.headers,
      scheduledFor: options.scheduledFor,
      correlationId: event.correlationId,
      causationId: event.causationId,
    };
  }

  /**
   * Derive topic name from event type
   *
   * Default implementation converts event type to topic:
   * - LOGIN_SUCCEEDED -> auth.login.succeeded
   * - ACCOUNT_CREATED -> account.created
   *
   * @param eventType - Event type string
   * @returns Topic name
   */
  protected deriveTopicFromEventType(eventType: string): string {
    // Convert SCREAMING_SNAKE_CASE to dot.separated.lowercase
    return eventType.toLowerCase().replace(/_/g, '.');
  }

  /**
   * Process a batch of events with the given publisher
   *
   * @param events - Events to process
   * @param publisher - Function that publishes an event to the message broker
   * @returns Processing result
   */
  async processBatch(
    events: OutboxEvent[],
    publisher: (event: OutboxEvent) => Promise<void>,
  ): Promise<OutboxProcessingResult> {
    const startTime = Date.now();
    const result: OutboxProcessingResult = {
      published: 0,
      failed: 0,
      skipped: 0,
      durationMs: 0,
      errors: [],
    };

    for (const event of events) {
      try {
        // Mark as processing
        await this.markAsProcessing(event.id);

        // Publish to message broker
        await publisher(event);

        // Mark as published
        await this.markAsPublished(event.id);
        result.published++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Increment retry or mark as failed
        const updatedEvent = await this.incrementRetry(event.id, errorMessage);

        if (updatedEvent.status === OutboxStatus.FAILED) {
          result.failed++;
          result.errors.push({
            eventId: event.id,
            error: errorMessage,
          });
          this.logger.error(
            `Outbox event ${event.id} (${event.eventType}) failed after ${updatedEvent.retryCount} retries: ${errorMessage}`,
          );
        } else {
          result.skipped++;
          this.logger.warn(
            `Outbox event ${event.id} (${event.eventType}) will be retried (attempt ${updatedEvent.retryCount}/${updatedEvent.maxRetries}): ${errorMessage}`,
          );
        }
      }
    }

    result.durationMs = Date.now() - startTime;

    if (result.published > 0 || result.failed > 0) {
      this.logger.log(
        `Processed ${events.length} outbox events: ${result.published} published, ${result.failed} failed, ${result.skipped} skipped (${result.durationMs}ms)`,
      );
    }

    return result;
  }
}

/**
 * Outbox Service injection token
 */
export const OUTBOX_SERVICE = Symbol('OUTBOX_SERVICE');
