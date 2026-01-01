import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ID } from '@my-girok/nest-common';
import { Prisma } from '.prisma/identity-client';
import { IdentityPrismaService } from '../../database';
import { OutboxStatus } from '.prisma/identity-client';
import { CryptoService } from '../crypto';

// Transaction client type
export type IdentityTransactionClient = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export interface OutboxEventPayload {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  /** Idempotency key to prevent duplicate events */
  idempotencyKey?: string;
  /** Metadata for tracing/debugging */
  metadata?: {
    correlationId?: string;
    causationId?: string;
    userId?: string;
    serviceId?: string;
  };
}

export interface OutboxEvent {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: string;
  retryCount: number;
  lastError: string | null;
  processedAt: Date | null;
  createdAt: Date;
  idempotencyKey: string | null;
  nextRetryAt: Date | null;
}

/**
 * Retry configuration for exponential backoff
 */
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Dead Letter Queue (DLQ) event for failed events
 */
export interface DeadLetterEvent {
  originalEventId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  failureReason: string;
  retryCount: number;
  movedAt: Date;
}

/**
 * Outbox Service for transactional outbox pattern
 *
 * Features:
 * - Transactional event publishing with atomicity guarantees
 * - Idempotency key support to prevent duplicate events
 * - Exponential backoff with jitter for retries
 * - Dead Letter Queue (DLQ) for permanently failed events
 * - Event correlation and causation tracking
 *
 * IMPORTANT: For transactional guarantees, use publishInTransaction() method
 * which accepts a transaction client and ensures atomicity with your business operations.
 */
@Injectable()
export class OutboxService implements OnModuleInit {
  private readonly logger = new Logger(OutboxService.name);
  private readonly retryConfig: RetryConfig;

  constructor(
    private readonly prisma: IdentityPrismaService,
    private readonly configService: ConfigService,
    private readonly cryptoService: CryptoService,
  ) {
    this.retryConfig = {
      maxRetries: this.configService.get<number>('outbox.maxRetries', 5),
      baseDelayMs: this.configService.get<number>('outbox.baseDelayMs', 1000),
      maxDelayMs: this.configService.get<number>('outbox.maxDelayMs', 300_000), // 5 minutes max
      backoffMultiplier: this.configService.get<number>('outbox.backoffMultiplier', 2),
    };
  }

  onModuleInit(): void {
    this.logger.log(
      `OutboxService initialized with retry config: maxRetries=${this.retryConfig.maxRetries}, ` +
        `baseDelay=${this.retryConfig.baseDelayMs}ms, maxDelay=${this.retryConfig.maxDelayMs}ms`,
    );
  }

  /**
   * Calculate next retry delay with exponential backoff + jitter
   */
  private calculateNextRetryDelay(retryCount: number): number {
    const { baseDelayMs, maxDelayMs, backoffMultiplier } = this.retryConfig;

    // Exponential backoff
    const exponentialDelay = baseDelayMs * Math.pow(backoffMultiplier, retryCount);

    // Cap at max delay
    const cappedDelay = Math.min(exponentialDelay, maxDelayMs);

    // Add jitter (±25% randomness to prevent thundering herd)
    const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);

    return Math.floor(cappedDelay + jitter);
  }

  /**
   * Generate idempotency key from event payload if not provided
   */
  private generateIdempotencyKey(event: OutboxEventPayload): string {
    if (event.idempotencyKey) {
      return event.idempotencyKey;
    }
    // Generate deterministic key from event content
    const content = `${event.aggregateType}:${event.aggregateId}:${event.eventType}:${JSON.stringify(event.payload)}`;
    return this.cryptoService.hash(content);
  }

  /**
   * Publish an event to the outbox table in a standalone transaction.
   *
   * WARNING: This method does NOT guarantee atomicity with your business operations.
   * For transactional guarantees, use publishInTransaction(tx, event).
   *
   * Features:
   * - Idempotency key support (prevents duplicate events)
   * - Metadata for correlation/causation tracking
   */
  async publish(event: OutboxEventPayload): Promise<OutboxEvent> {
    const id = ID.generate();
    const idempotencyKey = this.generateIdempotencyKey(event);

    // Check for existing event with same idempotency key (within 24 hours)
    const existingEvent = await this.prisma.outboxEvent.findFirst({
      where: {
        idempotencyKey,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    if (existingEvent) {
      this.logger.debug(
        `Duplicate event detected (idempotencyKey=${idempotencyKey}), returning existing event`,
      );
      return existingEvent as unknown as OutboxEvent;
    }

    const outboxEvent = await this.prisma.$transaction(async (tx) => {
      return tx.outboxEvent.create({
        data: {
          id,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          eventType: event.eventType,
          payload: {
            ...event.payload,
            _metadata: event.metadata,
          } as object,
          idempotencyKey,
          retryCount: 0,
          status: OutboxStatus.PENDING,
        },
      });
    });

    this.logger.debug(
      `Published event to outbox: ${event.eventType} for ${event.aggregateType}:${event.aggregateId}`,
    );

    return outboxEvent as unknown as OutboxEvent;
  }

  /**
   * Publish an event within an existing transaction (for atomicity)
   * This is the recommended method for ensuring event delivery consistency.
   */
  async publishInTransaction(
    tx: IdentityTransactionClient,
    event: OutboxEventPayload,
  ): Promise<OutboxEvent> {
    const id = ID.generate();
    const idempotencyKey = this.generateIdempotencyKey(event);

    // Check for existing event with same idempotency key (within 24 hours)
    const existingEvent = await tx.outboxEvent.findFirst({
      where: {
        idempotencyKey,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    if (existingEvent) {
      this.logger.debug(
        `Duplicate event detected in transaction (idempotencyKey=${idempotencyKey})`,
      );
      return existingEvent as unknown as OutboxEvent;
    }

    const outboxEvent = await tx.outboxEvent.create({
      data: {
        id,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        eventType: event.eventType,
        payload: {
          ...event.payload,
          _metadata: event.metadata,
        } as object,
        idempotencyKey,
        retryCount: 0,
        status: OutboxStatus.PENDING,
      },
    });

    this.logger.debug(
      `Published event to outbox (in-tx): ${event.eventType} for ${event.aggregateType}:${event.aggregateId}`,
    );

    return outboxEvent as unknown as OutboxEvent;
  }

  /**
   * Get pending events for processing (respects retry delays)
   */
  async getPendingEvents(limit: number = 100): Promise<OutboxEvent[]> {
    const now = new Date();

    return (await this.prisma.outboxEvent.findMany({
      where: {
        status: OutboxStatus.PENDING,
        retryCount: { lt: this.retryConfig.maxRetries },
        // Only get events where retry delay has passed
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    })) as unknown as OutboxEvent[];
  }

  /**
   * Get events ready for retry (respects backoff schedule)
   */
  async getRetryableEvents(limit: number = 50): Promise<OutboxEvent[]> {
    const now = new Date();

    return (await this.prisma.outboxEvent.findMany({
      where: {
        status: OutboxStatus.PENDING,
        retryCount: { gt: 0, lt: this.retryConfig.maxRetries },
        nextRetryAt: { lte: now },
      },
      orderBy: { nextRetryAt: 'asc' },
      take: limit,
    })) as unknown as OutboxEvent[];
  }

  /**
   * Atomically claim an event for processing (prevents race conditions)
   */
  async claimEvent(eventId: string): Promise<boolean> {
    const result = await this.prisma.outboxEvent.updateMany({
      where: {
        id: eventId,
        status: OutboxStatus.PENDING,
      },
      data: { status: OutboxStatus.PROCESSING },
    });

    if (result.count === 0) {
      this.logger.debug(`Event ${eventId} already claimed by another worker`);
    }

    return result.count > 0;
  }

  /**
   * Mark event as completed
   */
  async markAsCompleted(eventId: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id: eventId },
      data: { status: OutboxStatus.COMPLETED, processedAt: new Date() },
    });
    this.logger.debug(`Event ${eventId} marked as completed`);
  }

  /**
   * Mark event as failed with error and schedule retry with exponential backoff
   */
  async markAsFailed(eventId: string, error: string): Promise<void> {
    const event = await this.prisma.outboxEvent.findUnique({
      where: { id: eventId },
      select: {
        retryCount: true,
        aggregateType: true,
        aggregateId: true,
        eventType: true,
        payload: true,
      },
    });

    if (!event) {
      this.logger.warn(`Event ${eventId} not found`);
      return;
    }

    const newRetryCount = event.retryCount + 1;
    const isFailed = newRetryCount >= this.retryConfig.maxRetries;

    if (isFailed) {
      // Move to Dead Letter Queue
      await this.moveToDeadLetterQueue(eventId, event, error, newRetryCount);

      await this.prisma.outboxEvent.update({
        where: { id: eventId },
        data: {
          status: OutboxStatus.FAILED,
          retryCount: newRetryCount,
          lastError: error,
        },
      });

      this.logger.error(
        `Event ${eventId} exceeded max retries (${this.retryConfig.maxRetries}), moved to DLQ: ${error}`,
      );
    } else {
      // Schedule retry with exponential backoff
      const retryDelayMs = this.calculateNextRetryDelay(newRetryCount);
      const nextRetryAt = new Date(Date.now() + retryDelayMs);

      await this.prisma.outboxEvent.update({
        where: { id: eventId },
        data: {
          status: OutboxStatus.PENDING,
          retryCount: newRetryCount,
          lastError: error,
          nextRetryAt,
        },
      });

      this.logger.warn(
        `Event ${eventId} failed, retry ${newRetryCount}/${this.retryConfig.maxRetries} scheduled in ${retryDelayMs}ms: ${error}`,
      );
    }
  }

  /**
   * Move failed event to Dead Letter Queue for manual investigation
   */
  private async moveToDeadLetterQueue(
    eventId: string,
    event: { aggregateType: string; aggregateId: string; eventType: string; payload: unknown },
    failureReason: string,
    retryCount: number,
  ): Promise<void> {
    const dlqEvent: DeadLetterEvent = {
      originalEventId: eventId,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      eventType: event.eventType,
      payload: event.payload as Record<string, unknown>,
      failureReason,
      retryCount,
      movedAt: new Date(),
    };

    // Store in a separate DLQ table or log for alerting
    // For now, we log and could integrate with external alerting
    this.logger.error(`DLQ Event: ${JSON.stringify(dlqEvent)}`);

    // TODO: In production, this could:
    // 1. Write to a separate dead_letter_events table
    // 2. Send to an external DLQ (SQS, Kafka DLQ topic)
    // 3. Trigger PagerDuty/Slack alert
  }

  /**
   * Retry a specific failed event (for manual intervention)
   */
  async retryFailedEvent(eventId: string): Promise<boolean> {
    const result = await this.prisma.outboxEvent.updateMany({
      where: {
        id: eventId,
        status: OutboxStatus.FAILED,
      },
      data: {
        status: OutboxStatus.PENDING,
        retryCount: 0,
        lastError: null,
        nextRetryAt: null,
      },
    });

    if (result.count > 0) {
      this.logger.log(`Event ${eventId} reset for retry`);
      return true;
    }
    return false;
  }

  /**
   * Clean up old completed events
   */
  async cleanupCompletedEvents(olderThanDays: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.outboxEvent.deleteMany({
      where: {
        status: OutboxStatus.COMPLETED,
        processedAt: { lt: cutoffDate },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} completed events from outbox`);
    }

    return result.count;
  }

  /**
   * Get outbox statistics
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const [pending, processing, completed, failed] = await Promise.all([
      this.prisma.outboxEvent.count({ where: { status: OutboxStatus.PENDING } }),
      this.prisma.outboxEvent.count({ where: { status: OutboxStatus.PROCESSING } }),
      this.prisma.outboxEvent.count({ where: { status: OutboxStatus.COMPLETED } }),
      this.prisma.outboxEvent.count({ where: { status: OutboxStatus.FAILED } }),
    ]);

    return { pending, processing, completed, failed };
  }
}
