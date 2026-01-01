import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ID } from '@my-girok/nest-common';
import { DlqStatus, Prisma } from '.prisma/identity-client';
import { IdentityPrismaService } from '../../database/identity-prisma.service';

/**
 * Dead Letter Event input
 */
export interface DeadLetterEventInput {
  originalEventId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  failureReason: string;
  retryCount: number;
  originalTopic: string;
}

/**
 * DLQ Processing result
 */
export interface DlqProcessingResult {
  eventId: string;
  status: 'retried' | 'resolved' | 'ignored';
  resolution?: string;
}

/**
 * Dead Letter Queue Service
 * Manages failed events that could not be processed
 *
 * Features:
 * - Persists failed events to database
 * - Supports manual retry/resolution/ignore
 * - Automatic cleanup of old resolved events
 * - Alerting integration (extensible)
 */
@Injectable()
export class DlqService {
  private readonly logger = new Logger(DlqService.name);

  constructor(private readonly prisma: IdentityPrismaService) {}

  /**
   * Move a failed event to the Dead Letter Queue
   */
  async moveToDlq(event: DeadLetterEventInput): Promise<string> {
    const dlqEvent = await this.prisma.deadLetterEvent.create({
      data: {
        id: ID.generate(),
        originalEventId: event.originalEventId,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        eventType: event.eventType,
        payload: event.payload as Prisma.InputJsonValue,
        failureReason: event.failureReason,
        retryCount: event.retryCount,
        originalTopic: event.originalTopic,
        status: DlqStatus.PENDING,
      },
    });

    this.logger.warn(
      `Event moved to DLQ: ${event.eventType} for ${event.aggregateType}:${event.aggregateId}. ` +
        `Reason: ${event.failureReason}`,
    );

    // TODO: Send alert to PagerDuty/Slack for critical events
    await this.sendAlert(dlqEvent.id, event);

    return dlqEvent.id;
  }

  /**
   * Get pending DLQ events with pagination
   */
  async getPendingEvents(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      this.prisma.deadLetterEvent.findMany({
        where: { status: DlqStatus.PENDING },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.deadLetterEvent.count({
        where: { status: DlqStatus.PENDING },
      }),
    ]);

    return {
      data: events,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get DLQ event by ID
   */
  async getEventById(id: string) {
    return this.prisma.deadLetterEvent.findUnique({
      where: { id },
    });
  }

  /**
   * Retry a DLQ event
   * Marks as retried and returns the event for reprocessing
   */
  async retryEvent(id: string, processedBy: string): Promise<DlqProcessingResult> {
    await this.prisma.deadLetterEvent.update({
      where: { id },
      data: {
        status: DlqStatus.RETRIED,
        processedAt: new Date(),
        processedBy,
        resolution: 'Manually retried',
      },
    });

    this.logger.log(`DLQ event ${id} marked for retry by ${processedBy}`);

    return {
      eventId: id,
      status: 'retried',
      resolution: 'Manually retried',
    };
  }

  /**
   * Resolve a DLQ event manually
   * Used when the issue was fixed externally
   */
  async resolveEvent(
    id: string,
    processedBy: string,
    resolution: string,
  ): Promise<DlqProcessingResult> {
    await this.prisma.deadLetterEvent.update({
      where: { id },
      data: {
        status: DlqStatus.RESOLVED,
        processedAt: new Date(),
        processedBy,
        resolution,
      },
    });

    this.logger.log(`DLQ event ${id} resolved by ${processedBy}: ${resolution}`);

    return {
      eventId: id,
      status: 'resolved',
      resolution,
    };
  }

  /**
   * Ignore a DLQ event
   * Used for events that should not be retried (e.g., obsolete data)
   */
  async ignoreEvent(id: string, processedBy: string, reason: string): Promise<DlqProcessingResult> {
    await this.prisma.deadLetterEvent.update({
      where: { id },
      data: {
        status: DlqStatus.IGNORED,
        processedAt: new Date(),
        processedBy,
        resolution: `Ignored: ${reason}`,
      },
    });

    this.logger.log(`DLQ event ${id} ignored by ${processedBy}: ${reason}`);

    return {
      eventId: id,
      status: 'ignored',
      resolution: `Ignored: ${reason}`,
    };
  }

  /**
   * Get DLQ statistics
   */
  async getStatistics() {
    const [pending, retried, resolved, ignored] = await Promise.all([
      this.prisma.deadLetterEvent.count({ where: { status: DlqStatus.PENDING } }),
      this.prisma.deadLetterEvent.count({ where: { status: DlqStatus.RETRIED } }),
      this.prisma.deadLetterEvent.count({ where: { status: DlqStatus.RESOLVED } }),
      this.prisma.deadLetterEvent.count({ where: { status: DlqStatus.IGNORED } }),
    ]);

    return {
      pending,
      retried,
      resolved,
      ignored,
      total: pending + retried + resolved + ignored,
    };
  }

  /**
   * Cleanup old processed DLQ events
   * Runs daily at 4 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async cleanupOldEvents(): Promise<void> {
    const retentionDays = 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.prisma.deadLetterEvent.deleteMany({
      where: {
        processedAt: { lt: cutoffDate },
        status: {
          in: [DlqStatus.RESOLVED, DlqStatus.IGNORED],
        },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} old DLQ events`);
    }
  }

  /**
   * Send alert for DLQ event (extensible)
   * Override or extend for PagerDuty/Slack/etc integration
   */
  private async sendAlert(dlqEventId: string, event: DeadLetterEventInput): Promise<void> {
    // TODO: Implement actual alerting
    // For now, just log a warning that would trigger monitoring alerts
    this.logger.warn(
      `[ALERT] DLQ Event: ${dlqEventId} | Type: ${event.eventType} | ` +
        `Aggregate: ${event.aggregateType}:${event.aggregateId} | ` +
        `Reason: ${event.failureReason}`,
    );
  }
}
