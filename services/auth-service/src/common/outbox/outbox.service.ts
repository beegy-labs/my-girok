import { Injectable, Logger } from '@nestjs/common';
import { ID } from '@my-girok/nest-common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../../node_modules/.prisma/auth-client';

/**
 * Transactional client type for use within Prisma transactions.
 * This can be either a PrismaService or a Prisma transaction client.
 */
type TransactionalClient = PrismaService | Prisma.TransactionClient;

/**
 * Outbox event record interface.
 */
export interface OutboxEventRecord {
  id: string;
  eventType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  status: string;
  retryCount: number;
  errorMessage: string | null;
  publishedAt: Date | null;
  createdAt: Date;
}

/**
 * Input for creating an outbox event.
 */
export interface OutboxEventInput {
  eventType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
}

/**
 * OutboxService implements the Transactional Outbox Pattern.
 *
 * This pattern ensures reliable event publishing by:
 * 1. Writing events to a database table within the same transaction as business data
 * 2. A separate job polls and publishes pending events to Redpanda
 * 3. Published events are marked as PUBLISHED; failed events are retried up to 5 times
 *
 * @see https://microservices.io/patterns/data/transactional-outbox.html
 */
@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Add an event to the outbox within a transaction.
   * This method should be called within a @Transactional decorated method.
   *
   * @param tx - The transaction client (from Prisma.$transaction)
   * @param eventType - The type of event (e.g., 'ROLE_CREATED', 'OPERATOR_INVITED')
   * @param aggregateId - The ID of the aggregate root that produced the event
   * @param payload - The event payload (will be serialized to JSON)
   * @returns The created outbox event ID
   */
  async addEvent(
    tx: TransactionalClient,
    eventType: string,
    aggregateId: string,
    payload: Record<string, unknown>,
  ): Promise<string> {
    const id = ID.generate();
    const payloadJson = JSON.stringify(payload);

    await (tx as PrismaService).$executeRaw`
      INSERT INTO outbox_events (id, event_type, aggregate_id, payload, status, retry_count, created_at)
      VALUES (${id}, ${eventType}, ${aggregateId}, ${payloadJson}::jsonb, 'PENDING', 0, NOW())
    `;

    this.logger.debug(`Outbox event added: ${eventType} for aggregate ${aggregateId} (id: ${id})`);

    return id;
  }

  /**
   * Save a single event to the outbox within a transaction.
   * Alias for addEvent for consistency with interface naming.
   *
   * @param tx - The transaction client (from Prisma.$transaction)
   * @param event - The event data to save
   * @returns The created outbox event ID
   */
  async saveEvent(tx: TransactionalClient, event: OutboxEventInput): Promise<string> {
    return this.addEvent(tx, event.eventType, event.aggregateId, event.payload);
  }

  /**
   * Save multiple events to the outbox within a transaction.
   * All events are saved atomically as part of the same transaction.
   *
   * @param tx - The transaction client (from Prisma.$transaction)
   * @param events - Array of event data to save
   * @returns Array of created outbox event IDs
   */
  async saveEvents(tx: TransactionalClient, events: OutboxEventInput[]): Promise<string[]> {
    const ids: string[] = [];

    for (const event of events) {
      const id = await this.addEvent(tx, event.eventType, event.aggregateId, event.payload);
      ids.push(id);
    }

    this.logger.debug(`Outbox batch: ${events.length} events saved`);

    return ids;
  }

  /**
   * Get pending events for publishing.
   * Called by the OutboxPublisherJob.
   * Only returns events with retry count < 5.
   *
   * @param limit - Maximum number of events to fetch (default: 100)
   * @returns Array of pending outbox events
   */
  async getPendingEvents(limit = 100): Promise<OutboxEventRecord[]> {
    const events = await this.prisma.$queryRaw<OutboxEventRecord[]>`
      SELECT
        id,
        event_type AS "eventType",
        aggregate_id AS "aggregateId",
        payload,
        status,
        retry_count AS "retryCount",
        error_message AS "errorMessage",
        published_at AS "publishedAt",
        created_at AS "createdAt"
      FROM outbox_events
      WHERE status = 'PENDING' AND retry_count < 5
      ORDER BY created_at ASC
      LIMIT ${limit}
    `;
    return events;
  }

  /**
   * Mark an event as published.
   *
   * @param eventId - The outbox event ID
   */
  async markAsPublished(eventId: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE outbox_events
      SET status = 'PUBLISHED', published_at = NOW()
      WHERE id = ${eventId}
    `;

    this.logger.debug(`Outbox event published: ${eventId}`);
  }

  /**
   * Mark an event as failed after max retries.
   *
   * @param eventId - The outbox event ID
   * @param errorMessage - The error message from the last attempt
   */
  async markAsFailed(eventId: string, errorMessage: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE outbox_events
      SET status = 'FAILED', error_message = ${errorMessage}
      WHERE id = ${eventId}
    `;

    this.logger.warn(`Outbox event failed permanently: ${eventId}`);
  }

  /**
   * Increment retry count for a failed publish attempt.
   *
   * @param eventId - The outbox event ID
   * @param errorMessage - The error message from this attempt
   * @returns The new retry count
   */
  async incrementRetryCount(eventId: string, errorMessage: string): Promise<number> {
    const result = await this.prisma.$queryRaw<{ retryCount: number }[]>`
      UPDATE outbox_events
      SET retry_count = retry_count + 1, error_message = ${errorMessage}
      WHERE id = ${eventId}
      RETURNING retry_count AS "retryCount"
    `;

    return result[0]?.retryCount ?? 0;
  }

  /**
   * Clean up old published events.
   * Called periodically to prevent table bloat.
   *
   * @param olderThanDays - Delete events published more than N days ago (default: 7)
   * @returns Number of deleted events
   */
  async cleanupPublishedEvents(olderThanDays = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.$executeRaw`
      DELETE FROM outbox_events
      WHERE status = 'PUBLISHED' AND published_at < ${cutoffDate}
    `;

    if (result > 0) {
      this.logger.log(`Cleaned up ${result} old outbox events`);
    }

    return result;
  }
}
