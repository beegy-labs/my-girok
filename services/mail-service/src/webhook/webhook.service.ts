import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EmailStatus } from '.prisma/mail-client';
import { SesEventNotification, SnsMessage, WebhookProcessResult } from './webhook.types';

/**
 * Webhook Service
 * Handles processing of SES event notifications
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Process incoming SNS message containing SES event
   */
  async processSnsMessage(message: SnsMessage): Promise<WebhookProcessResult> {
    // Handle SNS subscription confirmation
    if (message.Type === 'SubscriptionConfirmation') {
      this.logger.log('Received SNS subscription confirmation', {
        topicArn: message.TopicArn,
        subscribeUrl: message.SubscribeURL,
      });
      return {
        success: true,
        eventType: 'Send',
        messageId: message.MessageId,
      };
    }

    // Parse SES event from message
    try {
      const sesEvent: SesEventNotification = JSON.parse(message.Message);
      return this.processEvent(sesEvent);
    } catch (error) {
      this.logger.error('Failed to parse SES event from SNS message', error);
      return {
        success: false,
        eventType: 'Send',
        messageId: message.MessageId,
        error: 'Failed to parse event',
      };
    }
  }

  /**
   * Process SES event notification
   */
  async processEvent(event: SesEventNotification): Promise<WebhookProcessResult> {
    const { notificationType, mail } = event;
    const messageId = mail.messageId;

    // Extract emailLogId from tags if present
    const emailLogId = mail.tags?.emailLogId?.[0];

    this.logger.log(`Processing ${notificationType} event`, {
      messageId,
      emailLogId,
    });

    try {
      switch (notificationType) {
        case 'Delivery':
          await this.handleDelivery(event, emailLogId);
          break;
        case 'Open':
          await this.handleOpen(event, emailLogId);
          break;
        case 'Click':
          await this.handleClick(event, emailLogId);
          break;
        case 'Bounce':
          await this.handleBounce(event, emailLogId);
          break;
        case 'Complaint':
          await this.handleComplaint(event, emailLogId);
          break;
        case 'Send':
          // Send is logged during initial send, no action needed
          this.logger.debug(`Send event received for ${messageId}`);
          break;
        case 'Reject':
          await this.handleReject(event, emailLogId);
          break;
        default:
          this.logger.warn(`Unhandled event type: ${notificationType}`);
      }

      return {
        success: true,
        eventType: notificationType,
        messageId,
        emailLogId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to process ${notificationType} event`, error);
      return {
        success: false,
        eventType: notificationType,
        messageId,
        emailLogId,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle delivery event
   * Note: DELIVERED maps to SENT status since schema doesn't have DELIVERED
   */
  private async handleDelivery(event: SesEventNotification, emailLogId?: string): Promise<void> {
    const deliveryTimestamp = event.delivery?.timestamp
      ? new Date(event.delivery.timestamp)
      : new Date();

    if (emailLogId) {
      await this.updateEmailLogStatus(emailLogId, EmailStatus.SENT, {
        sentAt: deliveryTimestamp,
      });
    } else {
      // Try to find by messageId
      await this.updateEmailLogByMessageId(event.mail.messageId, EmailStatus.SENT, {
        sentAt: deliveryTimestamp,
      });
    }

    this.logger.log('Delivery event processed', {
      messageId: event.mail.messageId,
      emailLogId,
      recipients: event.delivery?.recipients,
    });
  }

  /**
   * Handle open event
   */
  private async handleOpen(event: SesEventNotification, emailLogId?: string): Promise<void> {
    const openTimestamp = event.open?.timestamp ? new Date(event.open.timestamp) : new Date();

    if (emailLogId) {
      await this.updateEmailLogStatus(emailLogId, EmailStatus.OPENED, {
        openedAt: openTimestamp,
      });
    } else {
      await this.updateEmailLogByMessageId(event.mail.messageId, EmailStatus.OPENED, {
        openedAt: openTimestamp,
      });
    }

    this.logger.log('Open event processed', {
      messageId: event.mail.messageId,
      emailLogId,
      ipAddress: event.open?.ipAddress,
    });
  }

  /**
   * Handle click event
   */
  private async handleClick(event: SesEventNotification, emailLogId?: string): Promise<void> {
    const clickTimestamp = event.click?.timestamp ? new Date(event.click.timestamp) : new Date();

    if (emailLogId) {
      await this.updateEmailLogStatus(emailLogId, EmailStatus.CLICKED, {
        clickedAt: clickTimestamp,
      });
    } else {
      await this.updateEmailLogByMessageId(event.mail.messageId, EmailStatus.CLICKED, {
        clickedAt: clickTimestamp,
      });
    }

    this.logger.log('Click event processed', {
      messageId: event.mail.messageId,
      emailLogId,
      link: event.click?.link,
    });

    // Log to audit for verification link clicks
    if (emailLogId) {
      await this.logClickToAudit(emailLogId, event.click?.link);
    }
  }

  /**
   * Handle bounce event
   */
  private async handleBounce(event: SesEventNotification, emailLogId?: string): Promise<void> {
    const bounceTimestamp = event.bounce?.timestamp ? new Date(event.bounce.timestamp) : new Date();
    const isPermanent = event.bounce?.bounceType === 'Permanent';

    if (emailLogId) {
      await this.updateEmailLogStatus(emailLogId, EmailStatus.BOUNCED, {
        bouncedAt: bounceTimestamp,
        bounceType: event.bounce?.bounceType,
        error: this.formatBounceError(event),
      });
    } else {
      await this.updateEmailLogByMessageId(event.mail.messageId, EmailStatus.BOUNCED, {
        bouncedAt: bounceTimestamp,
        error: this.formatBounceError(event),
      });
    }

    // Log security event for hard bounces
    if (isPermanent) {
      await this.auditService.logSecurityEvent({
        eventType: 'EMAIL_HARD_BOUNCE',
        severity: 'MEDIUM',
        toEmail: event.bounce?.bouncedRecipients?.[0]?.emailAddress || '',
        messageId: event.mail.messageId,
        details: {
          bounceType: event.bounce?.bounceType,
          bounceSubType: event.bounce?.bounceSubType,
        },
      });
    }

    this.logger.warn('Bounce event processed', {
      messageId: event.mail.messageId,
      emailLogId,
      bounceType: event.bounce?.bounceType,
      bounceSubType: event.bounce?.bounceSubType,
    });
  }

  /**
   * Handle complaint event
   * Note: COMPLAINED maps to BOUNCED since schema doesn't have COMPLAINED
   */
  private async handleComplaint(event: SesEventNotification, emailLogId?: string): Promise<void> {
    const complaintTimestamp = event.complaint?.timestamp
      ? new Date(event.complaint.timestamp)
      : new Date();

    if (emailLogId) {
      await this.updateEmailLogStatus(emailLogId, EmailStatus.BOUNCED, {
        bouncedAt: complaintTimestamp,
        error: `Complaint: ${event.complaint?.complaintFeedbackType || 'unknown'}`,
      });
    } else {
      await this.updateEmailLogByMessageId(event.mail.messageId, EmailStatus.BOUNCED, {
        bouncedAt: complaintTimestamp,
        error: `Complaint: ${event.complaint?.complaintFeedbackType || 'unknown'}`,
      });
    }

    // Log security event for complaints
    await this.auditService.logSecurityEvent({
      eventType: 'EMAIL_COMPLAINT',
      severity: 'HIGH',
      toEmail: event.complaint?.complainedRecipients?.[0]?.emailAddress || '',
      messageId: event.mail.messageId,
      details: {
        feedbackType: event.complaint?.complaintFeedbackType,
      },
    });

    this.logger.warn('Complaint event processed', {
      messageId: event.mail.messageId,
      emailLogId,
      feedbackType: event.complaint?.complaintFeedbackType,
    });
  }

  /**
   * Handle reject event
   */
  private async handleReject(event: SesEventNotification, emailLogId?: string): Promise<void> {
    if (emailLogId) {
      await this.updateEmailLogStatus(emailLogId, EmailStatus.FAILED, {
        error: `Rejected: ${event.reject?.reason}`,
      });
    } else {
      await this.updateEmailLogByMessageId(event.mail.messageId, EmailStatus.FAILED, {
        error: `Rejected: ${event.reject?.reason}`,
      });
    }

    this.logger.warn('Reject event processed', {
      messageId: event.mail.messageId,
      emailLogId,
      reason: event.reject?.reason,
    });
  }

  /**
   * Update email log status by ID
   */
  private async updateEmailLogStatus(
    emailLogId: string,
    status: EmailStatus,
    data: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prismaService.emailLog.update({
        where: { id: emailLogId },
        data: {
          status,
          ...this.sanitizeUpdateData(data),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to update email log ${emailLogId}`, error);
    }
  }

  /**
   * Update email log status by SES message ID
   */
  private async updateEmailLogByMessageId(
    messageId: string,
    status: EmailStatus,
    data: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prismaService.emailLog.updateMany({
        where: { messageId },
        data: {
          status,
          ...this.sanitizeUpdateData(data),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to update email log by messageId ${messageId}`, error);
    }
  }

  /**
   * Sanitize update data to only include valid fields
   */
  private sanitizeUpdateData(data: Record<string, unknown>): Record<string, unknown> {
    const validFields = [
      'deliveredAt',
      'openedAt',
      'clickedAt',
      'bouncedAt',
      'complainedAt',
      'error',
    ];

    return Object.fromEntries(
      Object.entries(data).filter(
        ([key, value]) => validFields.includes(key) && value !== undefined,
      ),
    );
  }

  /**
   * Format bounce error message
   */
  private formatBounceError(event: SesEventNotification): string {
    const bounce = event.bounce;
    if (!bounce) return 'Unknown bounce';

    const recipient = bounce.bouncedRecipients?.[0];
    const diagnosticCode = recipient?.diagnosticCode || 'No diagnostic code';

    return `${bounce.bounceType} bounce (${bounce.bounceSubType}): ${diagnosticCode}`;
  }

  /**
   * Log verification link click to audit service
   */
  private async logClickToAudit(emailLogId: string, link?: string): Promise<void> {
    if (!link) return;

    // Check if this is a verification or password reset link
    const isVerificationLink =
      link.includes('/verify') || link.includes('/confirm') || link.includes('/reset-password');

    if (isVerificationLink) {
      try {
        const emailLog = await this.prismaService.emailLog.findUnique({
          where: { id: emailLogId },
          select: { tenantId: true, accountId: true, template: true },
        });

        if (emailLog?.accountId) {
          await this.auditService.logLinkClicked({
            tenantId: emailLog.tenantId,
            accountId: emailLog.accountId,
            template: emailLog.template,
            link,
          });
        }
      } catch (error) {
        this.logger.warn('Failed to log link click to audit', error);
      }
    }
  }
}
