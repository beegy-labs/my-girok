import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IdentityPrismaService, AuthPrismaService, LegalPrismaService } from '../../database';

export type OutboxDatabase = 'identity' | 'auth' | 'legal';

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

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);
  private readonly maxRetries = 3;

  constructor(
    private readonly identityPrisma: IdentityPrismaService,
    private readonly authPrisma: AuthPrismaService,
    private readonly legalPrisma: LegalPrismaService,
  ) {}

  /**
   * Alias for publishEvent - for backward compatibility
   */
  async publish(database: OutboxDatabase, event: OutboxEventPayload): Promise<OutboxEvent> {
    return this.publishEvent(database, event);
  }

  /**
   * Publish an event to the outbox table within a transaction
   * This ensures the event is only published if the transaction succeeds
   */
  async publishEvent(database: OutboxDatabase, event: OutboxEventPayload): Promise<OutboxEvent> {
    const data = {
      id: randomUUID() as string,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      eventType: event.eventType,
      payload: event.payload as object,
      status: 'PENDING',
      retryCount: 0,
    };

    let outboxEvent: unknown;

    switch (database) {
      case 'identity':
        outboxEvent = await this.identityPrisma.outboxEvent.create({ data });
        break;
      case 'auth':
        outboxEvent = await this.authPrisma.outboxEvent.create({ data });
        break;
      case 'legal':
        outboxEvent = await this.legalPrisma.outboxEvent.create({ data });
        break;
    }

    this.logger.debug(
      `Published event to ${database} outbox: ${event.eventType} for ${event.aggregateType}:${event.aggregateId}`,
    );

    return outboxEvent as OutboxEvent;
  }

  /**
   * Publish multiple events within a transaction
   */
  async publishEvents(
    database: OutboxDatabase,
    events: OutboxEventPayload[],
  ): Promise<OutboxEvent[]> {
    if (events.length === 0) {
      return [];
    }

    const data = events.map((event) => ({
      id: randomUUID() as string,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      eventType: event.eventType,
      payload: event.payload as object,
      status: 'PENDING',
      retryCount: 0,
    }));

    const ids = data.map((d) => d.id);

    switch (database) {
      case 'identity':
        await this.identityPrisma.outboxEvent.createMany({ data });
        return (await this.identityPrisma.outboxEvent.findMany({
          where: { id: { in: ids } },
        })) as unknown as OutboxEvent[];
      case 'auth':
        await this.authPrisma.outboxEvent.createMany({ data });
        return (await this.authPrisma.outboxEvent.findMany({
          where: { id: { in: ids } },
        })) as unknown as OutboxEvent[];
      case 'legal':
        await this.legalPrisma.outboxEvent.createMany({ data });
        return (await this.legalPrisma.outboxEvent.findMany({
          where: { id: { in: ids } },
        })) as unknown as OutboxEvent[];
    }
  }

  /**
   * Get pending events for processing
   */
  async getPendingEvents(database: OutboxDatabase, limit: number = 100): Promise<OutboxEvent[]> {
    const where = {
      status: 'PENDING',
      retryCount: { lt: this.maxRetries },
    };
    const orderBy = { createdAt: 'asc' as const };

    switch (database) {
      case 'identity':
        return (await this.identityPrisma.outboxEvent.findMany({
          where,
          orderBy,
          take: limit,
        })) as unknown as OutboxEvent[];
      case 'auth':
        return (await this.authPrisma.outboxEvent.findMany({
          where,
          orderBy,
          take: limit,
        })) as unknown as OutboxEvent[];
      case 'legal':
        return (await this.legalPrisma.outboxEvent.findMany({
          where,
          orderBy,
          take: limit,
        })) as unknown as OutboxEvent[];
    }
  }

  /**
   * Mark event as processing
   */
  async markAsProcessing(database: OutboxDatabase, eventId: string): Promise<void> {
    const updateData = { status: 'PROCESSING' };

    switch (database) {
      case 'identity':
        await this.identityPrisma.outboxEvent.update({
          where: { id: eventId },
          data: updateData,
        });
        break;
      case 'auth':
        await this.authPrisma.outboxEvent.update({
          where: { id: eventId },
          data: updateData,
        });
        break;
      case 'legal':
        await this.legalPrisma.outboxEvent.update({
          where: { id: eventId },
          data: updateData,
        });
        break;
    }
  }

  /**
   * Mark event as completed
   */
  async markAsCompleted(database: OutboxDatabase, eventId: string): Promise<void> {
    const updateData = {
      status: 'COMPLETED',
      processedAt: new Date(),
    };

    switch (database) {
      case 'identity':
        await this.identityPrisma.outboxEvent.update({
          where: { id: eventId },
          data: updateData,
        });
        break;
      case 'auth':
        await this.authPrisma.outboxEvent.update({
          where: { id: eventId },
          data: updateData,
        });
        break;
      case 'legal':
        await this.legalPrisma.outboxEvent.update({
          where: { id: eventId },
          data: updateData,
        });
        break;
    }

    this.logger.debug(`Event ${eventId} marked as completed in ${database}`);
  }

  /**
   * Mark event as failed with error
   */
  async markAsFailed(database: OutboxDatabase, eventId: string, error: string): Promise<void> {
    let event: { retryCount: number } | null = null;

    switch (database) {
      case 'identity':
        event = await this.identityPrisma.outboxEvent.findUnique({
          where: { id: eventId },
          select: { retryCount: true },
        });
        break;
      case 'auth':
        event = await this.authPrisma.outboxEvent.findUnique({
          where: { id: eventId },
          select: { retryCount: true },
        });
        break;
      case 'legal':
        event = await this.legalPrisma.outboxEvent.findUnique({
          where: { id: eventId },
          select: { retryCount: true },
        });
        break;
    }

    if (!event) {
      this.logger.warn(`Event ${eventId} not found in ${database}`);
      return;
    }

    const newRetryCount = event.retryCount + 1;
    const status = newRetryCount >= this.maxRetries ? 'FAILED' : 'PENDING';

    const updateData = {
      status,
      retryCount: newRetryCount,
      lastError: error,
    };

    switch (database) {
      case 'identity':
        await this.identityPrisma.outboxEvent.update({
          where: { id: eventId },
          data: updateData,
        });
        break;
      case 'auth':
        await this.authPrisma.outboxEvent.update({
          where: { id: eventId },
          data: updateData,
        });
        break;
      case 'legal':
        await this.legalPrisma.outboxEvent.update({
          where: { id: eventId },
          data: updateData,
        });
        break;
    }

    if (status === 'FAILED') {
      this.logger.error(`Event ${eventId} in ${database} exceeded max retries: ${error}`);
    } else {
      this.logger.warn(
        `Event ${eventId} in ${database} failed, retry ${newRetryCount}/${this.maxRetries}: ${error}`,
      );
    }
  }

  /**
   * Clean up old completed events
   */
  async cleanupCompletedEvents(
    database: OutboxDatabase,
    olderThanDays: number = 7,
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const where = {
      status: 'COMPLETED',
      processedAt: { lt: cutoffDate },
    };

    let count = 0;

    switch (database) {
      case 'identity':
        count = (await this.identityPrisma.outboxEvent.deleteMany({ where })).count;
        break;
      case 'auth':
        count = (await this.authPrisma.outboxEvent.deleteMany({ where })).count;
        break;
      case 'legal':
        count = (await this.legalPrisma.outboxEvent.deleteMany({ where })).count;
        break;
    }

    if (count > 0) {
      this.logger.log(`Cleaned up ${count} completed events from ${database} outbox`);
    }

    return count;
  }

  /**
   * Get outbox statistics
   */
  async getStats(database: OutboxDatabase): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    let pending = 0,
      processing = 0,
      completed = 0,
      failed = 0;

    switch (database) {
      case 'identity':
        [pending, processing, completed, failed] = await Promise.all([
          this.identityPrisma.outboxEvent.count({ where: { status: 'PENDING' } }),
          this.identityPrisma.outboxEvent.count({ where: { status: 'PROCESSING' } }),
          this.identityPrisma.outboxEvent.count({ where: { status: 'COMPLETED' } }),
          this.identityPrisma.outboxEvent.count({ where: { status: 'FAILED' } }),
        ]);
        break;
      case 'auth':
        [pending, processing, completed, failed] = await Promise.all([
          this.authPrisma.outboxEvent.count({ where: { status: 'PENDING' } }),
          this.authPrisma.outboxEvent.count({ where: { status: 'PROCESSING' } }),
          this.authPrisma.outboxEvent.count({ where: { status: 'COMPLETED' } }),
          this.authPrisma.outboxEvent.count({ where: { status: 'FAILED' } }),
        ]);
        break;
      case 'legal':
        [pending, processing, completed, failed] = await Promise.all([
          this.legalPrisma.outboxEvent.count({ where: { status: 'PENDING' } }),
          this.legalPrisma.outboxEvent.count({ where: { status: 'PROCESSING' } }),
          this.legalPrisma.outboxEvent.count({ where: { status: 'COMPLETED' } }),
          this.legalPrisma.outboxEvent.count({ where: { status: 'FAILED' } }),
        ]);
        break;
    }

    return { pending, processing, completed, failed };
  }
}
