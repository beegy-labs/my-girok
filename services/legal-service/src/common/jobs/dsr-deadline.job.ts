import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../outbox/outbox.service';
import { DsrRequestStatus, DsrEscalationLevel } from '.prisma/legal-client';

/**
 * DSR Deadline Monitor Job
 *
 * Monitors DSR (Data Subject Rights) requests for approaching deadlines
 * and overdue requests. GDPR requires responses within 30 days.
 *
 * Escalation levels:
 * - NONE: More than 7 days remaining
 * - WARNING: 7 days or less remaining
 * - CRITICAL: 2 days or less remaining
 * - OVERDUE: Past due date
 *
 * Events emitted:
 * - dsr.deadline.approaching: DSR request deadline is within 7 days
 * - dsr.deadline.warning: DSR request deadline is within 3 days
 * - dsr.deadline.overdue: DSR request has passed its deadline
 */
@Injectable()
export class DsrDeadlineJob implements OnModuleInit {
  private readonly logger = new Logger(DsrDeadlineJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly outboxService: OutboxService,
  ) {}

  onModuleInit(): void {
    this.logger.log('DSR deadline monitor job initialized');
  }

  /**
   * Check for approaching and overdue deadlines every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkDeadlines(): Promise<void> {
    this.logger.debug('Checking DSR request deadlines');

    try {
      await Promise.all([
        this.escalateWarningLevel(),
        this.escalateCriticalLevel(),
        this.escalateOverdueLevel(),
      ]);
    } catch (error) {
      this.logger.error('DSR deadline check failed', error);
    }
  }

  /**
   * Escalate to WARNING level (7 days or less remaining)
   * Only escalates requests that are not already at WARNING or higher level
   */
  private async escalateWarningLevel(): Promise<void> {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    const requests = await this.prisma.dsrRequest.findMany({
      where: {
        status: { in: [DsrRequestStatus.PENDING, DsrRequestStatus.IN_PROGRESS] },
        escalationLevel: DsrEscalationLevel.NONE,
        dueDate: {
          gt: twoDaysFromNow,
          lte: sevenDaysFromNow,
        },
      },
      select: {
        id: true,
        accountId: true,
        requestType: true,
        dueDate: true,
        assignedTo: true,
      },
    });

    for (const request of requests) {
      const daysRemaining = Math.ceil(
        (request.dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
      );

      // Update escalation level in transaction with outbox event
      await this.prisma.$transaction(async (tx) => {
        await tx.dsrRequest.update({
          where: { id: request.id },
          data: {
            escalationLevel: DsrEscalationLevel.WARNING,
            escalatedAt: now,
          },
        });

        await this.outboxService.addEvent(
          {
            aggregateType: 'DsrRequest',
            aggregateId: request.id,
            eventType: 'DSR_DEADLINE_WARNING',
            payload: {
              requestId: request.id,
              accountId: request.accountId,
              requestType: request.requestType,
              dueDate: request.dueDate.toISOString(),
              daysRemaining,
              escalationLevel: 'WARNING',
              assignedTo: request.assignedTo,
            },
          },
          tx,
        );
      });

      this.eventEmitter.emit('dsr.deadline.approaching', {
        requestId: request.id,
        accountId: request.accountId,
        requestType: request.requestType,
        dueDate: request.dueDate,
        daysRemaining,
        assignedTo: request.assignedTo,
      });

      this.logger.log(`DSR ${request.id} escalated to WARNING: ${daysRemaining} days remaining`);
    }
  }

  /**
   * Escalate to CRITICAL level (2 days or less remaining)
   */
  private async escalateCriticalLevel(): Promise<void> {
    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    const requests = await this.prisma.dsrRequest.findMany({
      where: {
        status: { in: [DsrRequestStatus.PENDING, DsrRequestStatus.IN_PROGRESS] },
        escalationLevel: { in: [DsrEscalationLevel.NONE, DsrEscalationLevel.WARNING] },
        dueDate: {
          gt: now,
          lte: twoDaysFromNow,
        },
      },
      select: {
        id: true,
        accountId: true,
        requestType: true,
        dueDate: true,
        assignedTo: true,
      },
    });

    for (const request of requests) {
      const hoursRemaining = Math.ceil(
        (request.dueDate.getTime() - now.getTime()) / (60 * 60 * 1000),
      );

      // Update escalation level in transaction with outbox event
      await this.prisma.$transaction(async (tx) => {
        await tx.dsrRequest.update({
          where: { id: request.id },
          data: {
            escalationLevel: DsrEscalationLevel.CRITICAL,
            escalatedAt: now,
          },
        });

        await this.outboxService.addEvent(
          {
            aggregateType: 'DsrRequest',
            aggregateId: request.id,
            eventType: 'DSR_DEADLINE_CRITICAL',
            payload: {
              requestId: request.id,
              accountId: request.accountId,
              requestType: request.requestType,
              dueDate: request.dueDate.toISOString(),
              hoursRemaining,
              escalationLevel: 'CRITICAL',
              assignedTo: request.assignedTo,
            },
          },
          tx,
        );
      });

      this.eventEmitter.emit('dsr.deadline.warning', {
        requestId: request.id,
        accountId: request.accountId,
        requestType: request.requestType,
        dueDate: request.dueDate,
        hoursRemaining,
        assignedTo: request.assignedTo,
      });

      this.logger.warn(
        `DSR ${request.id} escalated to CRITICAL: ${hoursRemaining} hours remaining`,
      );
    }
  }

  /**
   * Escalate to OVERDUE level (past due date)
   */
  private async escalateOverdueLevel(): Promise<void> {
    const now = new Date();

    const requests = await this.prisma.dsrRequest.findMany({
      where: {
        status: { in: [DsrRequestStatus.PENDING, DsrRequestStatus.IN_PROGRESS] },
        escalationLevel: { not: DsrEscalationLevel.OVERDUE },
        dueDate: { lt: now },
      },
      select: {
        id: true,
        accountId: true,
        requestType: true,
        dueDate: true,
        assignedTo: true,
      },
    });

    for (const request of requests) {
      const daysOverdue = Math.ceil(
        (now.getTime() - request.dueDate.getTime()) / (24 * 60 * 60 * 1000),
      );

      // Update escalation level in transaction with outbox event
      await this.prisma.$transaction(async (tx) => {
        await tx.dsrRequest.update({
          where: { id: request.id },
          data: {
            escalationLevel: DsrEscalationLevel.OVERDUE,
            escalatedAt: now,
          },
        });

        await this.outboxService.addEvent(
          {
            aggregateType: 'DsrRequest',
            aggregateId: request.id,
            eventType: 'DSR_DEADLINE_OVERDUE',
            payload: {
              requestId: request.id,
              accountId: request.accountId,
              requestType: request.requestType,
              dueDate: request.dueDate.toISOString(),
              daysOverdue,
              escalationLevel: 'OVERDUE',
              assignedTo: request.assignedTo,
            },
          },
          tx,
        );
      });

      this.eventEmitter.emit('dsr.deadline.overdue', {
        requestId: request.id,
        accountId: request.accountId,
        requestType: request.requestType,
        dueDate: request.dueDate,
        daysOverdue,
        assignedTo: request.assignedTo,
      });

      this.logger.error(`DSR ${request.id} escalated to OVERDUE: ${daysOverdue} days overdue`);
    }
  }

  /**
   * Generate daily summary report at 8 AM
   */
  @Cron('0 8 * * *')
  async generateDailySummary(): Promise<void> {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    try {
      const [pending, inProgress, approaching, overdue] = await Promise.all([
        this.prisma.dsrRequest.count({
          where: { status: DsrRequestStatus.PENDING },
        }),
        this.prisma.dsrRequest.count({
          where: { status: DsrRequestStatus.IN_PROGRESS },
        }),
        this.prisma.dsrRequest.count({
          where: {
            status: { in: [DsrRequestStatus.PENDING, DsrRequestStatus.IN_PROGRESS] },
            dueDate: { lte: sevenDaysFromNow, gt: now },
          },
        }),
        this.prisma.dsrRequest.count({
          where: {
            status: { in: [DsrRequestStatus.PENDING, DsrRequestStatus.IN_PROGRESS] },
            dueDate: { lt: now },
          },
        }),
      ]);

      this.eventEmitter.emit('dsr.daily.summary', {
        date: now.toISOString().split('T')[0],
        pending,
        inProgress,
        approachingDeadline: approaching,
        overdue,
      });

      this.logger.log(
        `DSR Daily Summary: ${pending} pending, ${inProgress} in progress, ` +
          `${approaching} approaching deadline, ${overdue} overdue`,
      );
    } catch (error) {
      this.logger.error('Failed to generate DSR daily summary', error);
    }
  }
}
