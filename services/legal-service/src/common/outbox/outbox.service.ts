import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { OutboxStatus, Prisma } from '.prisma/legal-client';

/**
 * Outbox Event DTO for creating events
 */
export interface CreateOutboxEventDto {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

/**
 * Outbox Service for legal-service
 *
 * Implements the Transactional Outbox pattern for reliable event publishing.
 * Events are stored in the database within the same transaction as domain operations,
 * then polled and published to Redpanda by a background job.
 */
@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Add an event to the outbox within a transaction
   */
  async addEvent(dto: CreateOutboxEventDto, tx?: Prisma.TransactionClient): Promise<string> {
    const client = tx ?? this.prisma;
    const id = crypto.randomUUID();

    await client.outboxEvent.create({
      data: {
        id,
        aggregateType: dto.aggregateType,
        aggregateId: dto.aggregateId,
        eventType: dto.eventType,
        payload: dto.payload as Prisma.JsonObject,
        status: OutboxStatus.PENDING,
      },
    });

    this.logger.debug(
      `Outbox event created: ${dto.eventType} for ${dto.aggregateType}:${dto.aggregateId}`,
    );
    return id;
  }

  /**
   * Get pending events for processing
   */
  async getPendingEvents(limit: number = 100): Promise<
    Array<{
      id: string;
      aggregateType: string;
      aggregateId: string;
      eventType: string;
      payload: Prisma.JsonValue;
      retryCount: number;
      createdAt: Date;
    }>
  > {
    return this.prisma.outboxEvent.findMany({
      where: {
        status: OutboxStatus.PENDING,
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: {
        id: true,
        aggregateType: true,
        aggregateId: true,
        eventType: true,
        payload: true,
        retryCount: true,
        createdAt: true,
      },
    });
  }

  /**
   * Mark event as processing
   */
  async markAsProcessing(id: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: { status: OutboxStatus.PROCESSING },
    });
  }

  /**
   * Mark event as completed
   */
  async markAsCompleted(id: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: OutboxStatus.COMPLETED,
        processedAt: new Date(),
      },
    });
    this.logger.debug(`Outbox event completed: ${id}`);
  }

  /**
   * Mark event as failed
   */
  async markAsFailed(id: string, error: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: OutboxStatus.FAILED,
        lastError: error,
        processedAt: new Date(),
      },
    });
    this.logger.warn(`Outbox event failed: ${id} - ${error}`);
  }

  /**
   * Increment retry count and reset to pending
   */
  async incrementRetryCount(id: string, error: string): Promise<number> {
    const event = await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        retryCount: { increment: 1 },
        lastError: error,
        status: OutboxStatus.PENDING,
      },
    });
    return event.retryCount;
  }

  /**
   * Cleanup old completed events
   */
  async cleanupCompleted(olderThanDays: number = 7): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    const result = await this.prisma.outboxEvent.deleteMany({
      where: {
        status: OutboxStatus.COMPLETED,
        processedAt: { lt: cutoff },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} completed outbox events`);
    }
    return result.count;
  }
}
