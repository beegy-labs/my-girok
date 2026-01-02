import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../outbox/outbox.service';
import { ConsentStatus } from '.prisma/legal-client';

/**
 * Consent Expiration Job
 *
 * Monitors user consents for expiration and handles expired consent cleanup.
 * Saves events to outbox for reliable event publishing.
 *
 * Events:
 * - CONSENT_EXPIRING_SOON: Consent will expire within 30 days
 * - CONSENT_EXPIRED: Consent has expired and was marked as such
 */
@Injectable()
export class ConsentExpirationJob implements OnModuleInit {
  private readonly logger = new Logger(ConsentExpirationJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly outboxService: OutboxService,
  ) {}

  onModuleInit(): void {
    this.logger.log('Consent expiration job initialized');
  }

  /**
   * Check for expiring consents daily at 2 AM
   */
  @Cron('0 2 * * *')
  async checkExpiringConsents(): Promise<void> {
    this.logger.debug('Checking for expiring consents');

    try {
      await Promise.all([this.notifyExpiringSoon(), this.markExpiredConsents()]);
    } catch (error) {
      this.logger.error('Consent expiration check failed', error);
    }
  }

  /**
   * Notify about consents expiring within 30 days
   * Saves reminder events to outbox for each expiring consent
   */
  private async notifyExpiringSoon(): Promise<void> {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const expiringConsents = await this.prisma.consent.findMany({
      where: {
        status: ConsentStatus.GRANTED,
        expiresAt: {
          gt: now,
          lte: thirtyDaysFromNow,
        },
      },
      select: {
        id: true,
        accountId: true,
        documentId: true,
        expiresAt: true,
        document: {
          select: {
            type: true,
            title: true,
          },
        },
      },
    });

    for (const consent of expiringConsents) {
      const daysUntilExpiry = Math.ceil(
        ((consent.expiresAt as Date).getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
      );

      // Save expiring soon event to outbox for notification
      await this.outboxService.addEvent({
        aggregateType: 'Consent',
        aggregateId: consent.id,
        eventType: 'CONSENT_EXPIRING_SOON',
        payload: {
          consentId: consent.id,
          accountId: consent.accountId,
          documentId: consent.documentId,
          documentType: consent.document.type,
          documentTitle: consent.document.title,
          expiresAt: (consent.expiresAt as Date).toISOString(),
          daysUntilExpiry,
        },
      });

      this.eventEmitter.emit('consent.expiring.soon', {
        consentId: consent.id,
        accountId: consent.accountId,
        documentId: consent.documentId,
        documentType: consent.document.type,
        documentTitle: consent.document.title,
        expiresAt: consent.expiresAt,
        daysUntilExpiry,
      });

      this.logger.log(
        `Consent ${consent.id} expiring in ${daysUntilExpiry} days ` +
          `(${consent.document.type} for account ${consent.accountId})`,
      );
    }

    if (expiringConsents.length > 0) {
      this.logger.log(`Found ${expiringConsents.length} consents expiring within 30 days`);
    }
  }

  /**
   * Mark expired consents as EXPIRED
   * Uses transaction to update status and save CONSENT_EXPIRED event to outbox atomically
   */
  private async markExpiredConsents(): Promise<void> {
    const now = new Date();

    // Find expired consents
    const expiredConsents = await this.prisma.consent.findMany({
      where: {
        status: ConsentStatus.GRANTED,
        expiresAt: { lte: now },
      },
      select: {
        id: true,
        accountId: true,
        documentId: true,
        expiresAt: true,
        consentedAt: true,
        document: {
          select: {
            type: true,
            title: true,
            version: true,
          },
        },
      },
    });

    if (expiredConsents.length === 0) {
      return;
    }

    // Process each expired consent in its own transaction for reliability
    for (const consent of expiredConsents) {
      await this.prisma.$transaction(async (tx) => {
        // Update status
        await tx.consent.update({
          where: { id: consent.id },
          data: { status: ConsentStatus.EXPIRED },
        });

        // Save CONSENT_EXPIRED event to outbox
        await this.outboxService.addEvent(
          {
            aggregateType: 'Consent',
            aggregateId: consent.id,
            eventType: 'CONSENT_EXPIRED',
            payload: {
              consentId: consent.id,
              accountId: consent.accountId,
              documentId: consent.documentId,
              documentType: consent.document.type,
              documentVersion: consent.document.version,
              consentedAt: consent.consentedAt.toISOString(),
              expiredAt: (consent.expiresAt as Date).toISOString(),
              accessRestricted: true, // Flag that may require re-consent
            },
          },
          tx,
        );
      });

      this.eventEmitter.emit('consent.expired', {
        consentId: consent.id,
        accountId: consent.accountId,
        documentId: consent.documentId,
        documentType: consent.document.type,
        documentTitle: consent.document.title,
        expiredAt: consent.expiresAt,
      });

      this.logger.log(
        `Consent ${consent.id} marked as expired ` +
          `(${consent.document.type} for account ${consent.accountId})`,
      );
    }

    this.logger.log(`Marked ${expiredConsents.length} consents as expired`);
  }

  /**
   * Generate monthly consent statistics
   */
  @Cron('0 0 1 * *') // First day of each month at midnight
  async generateMonthlyStats(): Promise<void> {
    try {
      const [granted, withdrawn, expired, total] = await Promise.all([
        this.prisma.consent.count({ where: { status: ConsentStatus.GRANTED } }),
        this.prisma.consent.count({ where: { status: ConsentStatus.WITHDRAWN } }),
        this.prisma.consent.count({ where: { status: ConsentStatus.EXPIRED } }),
        this.prisma.consent.count(),
      ]);

      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const expiringSoon = await this.prisma.consent.count({
        where: {
          status: ConsentStatus.GRANTED,
          expiresAt: { lte: thirtyDaysFromNow, gt: now },
        },
      });

      this.eventEmitter.emit('consent.monthly.stats', {
        month: now.toISOString().slice(0, 7),
        granted,
        withdrawn,
        expired,
        total,
        expiringSoon,
      });

      this.logger.log(
        `Monthly Consent Stats: ${granted} granted, ${withdrawn} withdrawn, ` +
          `${expired} expired, ${expiringSoon} expiring soon (total: ${total})`,
      );
    } catch (error) {
      this.logger.error('Failed to generate monthly consent stats', error);
    }
  }
}
