import { Injectable, Logger } from '@nestjs/common';
import { ID } from '@my-girok/nest-common';
import { Prisma } from '.prisma/identity-client';
import { IdentityPrismaService } from '../../database';
import { OutboxStatus } from '.prisma/identity-client';

// Transaction client type
export type TransactionClient = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export interface OutboxEventPayload {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
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
}

/**
 * Outbox Service for transactional outbox pattern
 */
@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);
  private readonly maxRetries = 3;

  constructor(private readonly prisma: IdentityPrismaService) {}

  /**
   * Publish an event to the outbox table
   */
  async publishEvent(event: OutboxEventPayload): Promise<OutboxEvent> {
    const id = ID.generate();
    const outboxEvent = await this.prisma.$transaction(async (tx) => {
      return (await tx.outboxEvent.create({
        data: {
          id,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          eventType: event.eventType,
          payload: event.payload as object,
          retryCount: 0,
          status: OutboxStatus.PENDING,
        },
      })) as unknown as OutboxEvent;
    });

    this.logger.debug(
      `Published event: ${event.eventType} for ${event.aggregateType}:${event.aggregateId}`,
    );

    return outboxEvent;
  }

  /**
   * Publish an event within an existing transaction
   */
  async publishInTransaction(
    tx: TransactionClient,
    event: OutboxEventPayload,
  ): Promise<OutboxEvent> {
    const id = ID.generate();
    const outboxEvent = await tx.outboxEvent.create({
      data: {
        id,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        eventType: event.eventType,
        payload: event.payload as object,
        retryCount: 0,
        status: OutboxStatus.PENDING,
      },
    });

    this.logger.debug(
      `Published event (in-tx): ${event.eventType} for ${event.aggregateType}:${event.aggregateId}`,
    );

    return outboxEvent as unknown as OutboxEvent;
  }

  /**
   * Get pending events for processing
   */
  async getPendingEvents(limit: number = 100): Promise<OutboxEvent[]> {
    return (await this.prisma.outboxEvent.findMany({
      where: {
        status: OutboxStatus.PENDING,
        retryCount: { lt: this.maxRetries },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    })) as unknown as OutboxEvent[];
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
   * Mark event as failed
   */
  async markAsFailed(eventId: string, error: string): Promise<void> {
    const event = await this.prisma.outboxEvent.findUnique({
      where: { id: eventId },
      select: { retryCount: true },
    });

    if (!event) {
      this.logger.warn(`Event ${eventId} not found`);
      return;
    }

    const newRetryCount = event.retryCount + 1;
    const isFailed = newRetryCount >= this.maxRetries;

    await this.prisma.outboxEvent.update({
      where: { id: eventId },
      data: {
        status: isFailed ? OutboxStatus.FAILED : OutboxStatus.PENDING,
        retryCount: newRetryCount,
        lastError: error,
      },
    });

    if (isFailed) {
      this.logger.error(`Event ${eventId} exceeded max retries: ${error}`);
    }
  }

  /**
   * Mark event as processing
   */
  async markAsProcessing(eventId: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id: eventId },
      data: { status: OutboxStatus.PROCESSING },
    });
    this.logger.debug(`Event ${eventId} marked as processing`);
  }

  /**
   * Clean up old completed events
   */
  async cleanupCompletedEvents(olderThanDays: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const { count } = await this.prisma.outboxEvent.deleteMany({
      where: {
        status: OutboxStatus.COMPLETED,
        processedAt: { lt: cutoffDate },
      },
    });

    if (count > 0) {
      this.logger.log(`Cleaned up ${count} completed events`);
    }

    return count;
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
