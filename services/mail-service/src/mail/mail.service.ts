import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TemplateService } from '../templates/template.service';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { SesService } from '../ses/ses.service';
import {
  SendEmailRequest,
  SendEmailResponse,
  SendBulkEmailRequest,
  SendBulkEmailResponse,
  GetEmailStatusRequest,
  GetEmailStatusResponse,
  GetInboxRequest,
  GetInboxResponse,
  MarkAsReadRequest,
  MarkAsReadResponse,
  EmailTemplate,
  EmailStatus,
  BulkEmailItem,
} from './mail.interface';

/** Concurrency limit for bulk email processing */
const BULK_EMAIL_CONCURRENCY_LIMIT = 10;

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly templateService: TemplateService,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly sesService: SesService,
  ) {}

  private templateToString(template: EmailTemplate): string {
    const templateMap: Record<EmailTemplate, string> = {
      [EmailTemplate.EMAIL_TEMPLATE_UNSPECIFIED]: 'UNSPECIFIED',
      [EmailTemplate.EMAIL_TEMPLATE_ADMIN_INVITE]: 'ADMIN_INVITE',
      [EmailTemplate.EMAIL_TEMPLATE_PARTNER_INVITE]: 'PARTNER_INVITE',
      [EmailTemplate.EMAIL_TEMPLATE_PASSWORD_RESET]: 'PASSWORD_RESET',
      [EmailTemplate.EMAIL_TEMPLATE_WELCOME]: 'WELCOME',
      [EmailTemplate.EMAIL_TEMPLATE_EMAIL_VERIFICATION]: 'EMAIL_VERIFICATION',
      [EmailTemplate.EMAIL_TEMPLATE_MFA_CODE]: 'MFA_CODE',
      [EmailTemplate.EMAIL_TEMPLATE_ACCOUNT_LOCKED]: 'ACCOUNT_LOCKED',
      [EmailTemplate.EMAIL_TEMPLATE_ACCOUNT_UNLOCKED]: 'ACCOUNT_UNLOCKED',
    };
    return templateMap[template] || 'UNSPECIFIED';
  }

  private stringToTemplate(templateStr: string): EmailTemplate {
    const templateMap: Record<string, EmailTemplate> = {
      ADMIN_INVITE: EmailTemplate.EMAIL_TEMPLATE_ADMIN_INVITE,
      PARTNER_INVITE: EmailTemplate.EMAIL_TEMPLATE_PARTNER_INVITE,
      PASSWORD_RESET: EmailTemplate.EMAIL_TEMPLATE_PASSWORD_RESET,
      WELCOME: EmailTemplate.EMAIL_TEMPLATE_WELCOME,
      EMAIL_VERIFICATION: EmailTemplate.EMAIL_TEMPLATE_EMAIL_VERIFICATION,
      MFA_CODE: EmailTemplate.EMAIL_TEMPLATE_MFA_CODE,
      ACCOUNT_LOCKED: EmailTemplate.EMAIL_TEMPLATE_ACCOUNT_LOCKED,
      ACCOUNT_UNLOCKED: EmailTemplate.EMAIL_TEMPLATE_ACCOUNT_UNLOCKED,
    };
    return templateMap[templateStr] || EmailTemplate.EMAIL_TEMPLATE_UNSPECIFIED;
  }

  private statusToEnum(status: string): EmailStatus {
    const statusMap: Record<string, EmailStatus> = {
      PENDING: EmailStatus.EMAIL_STATUS_PENDING,
      SENT: EmailStatus.EMAIL_STATUS_SENT,
      DELIVERED: EmailStatus.EMAIL_STATUS_SENT, // DELIVERED maps to SENT for enum compatibility
      FAILED: EmailStatus.EMAIL_STATUS_FAILED,
      BOUNCED: EmailStatus.EMAIL_STATUS_BOUNCED,
      OPENED: EmailStatus.EMAIL_STATUS_OPENED,
      CLICKED: EmailStatus.EMAIL_STATUS_CLICKED,
      COMPLAINED: EmailStatus.EMAIL_STATUS_BOUNCED, // Complaints are similar to bounces
    };
    return statusMap[status] || EmailStatus.EMAIL_STATUS_UNSPECIFIED;
  }

  async sendEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
    try {
      // Render template to get subject
      const templateName = this.templateService.templateEnumToName(request.template);
      const rendered = await this.templateService.render(
        templateName,
        request.locale || 'en',
        request.variables,
      );

      // Create email log and inbox entry in a transaction for atomicity
      const { emailLog } = await this.prisma.$transaction(async (tx) => {
        const emailLog = await tx.emailLog.create({
          data: {
            tenantId: request.tenantId,
            accountId: request.accountId || null,
            sourceService: request.sourceService,
            fromEmail: request.fromEmail,
            toEmail: request.toEmail,
            template: this.templateToString(request.template),
            locale: request.locale || 'en',
            subject: rendered.subject,
            status: 'PENDING',
            metadata: request.metadata || {},
          },
        });

        // Create inbox entry if accountId is provided
        if (request.accountId) {
          await tx.inbox.create({
            data: {
              tenantId: request.tenantId,
              accountId: request.accountId,
              emailLogId: emailLog.id,
            },
          });
        }

        return { emailLog };
      });

      // Publish to Kafka for async processing
      if (this.kafkaProducer.isKafkaEnabled()) {
        await this.kafkaProducer.publishMailSend({
          emailLogId: emailLog.id,
          tenantId: request.tenantId,
          accountId: request.accountId,
          toEmail: request.toEmail,
          fromEmail: request.fromEmail,
          template: request.template,
          locale: request.locale || 'en',
          variables: request.variables,
          sourceService: request.sourceService,
          metadata: request.metadata,
          retryCount: 0,
        });

        this.logger.log(`Email queued to Kafka: ${emailLog.id} to ${request.toEmail}`);
      } else {
        // Fallback: Send synchronously when Kafka is disabled
        this.logger.warn(`Kafka disabled. Sending email ${emailLog.id} synchronously`);
        try {
          const sesResult = await this.sesService.sendEmail({
            to: request.toEmail,
            from: request.fromEmail,
            subject: rendered.subject,
            htmlBody: rendered.body,
            emailLogId: emailLog.id,
          });

          if (sesResult.success) {
            await this.prisma.emailLog.update({
              where: { id: emailLog.id },
              data: { status: 'SENT', sentAt: new Date() },
            });
          } else {
            await this.prisma.emailLog.update({
              where: { id: emailLog.id },
              data: { status: 'FAILED', error: sesResult.error },
            });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          await this.prisma.emailLog.update({
            where: { id: emailLog.id },
            data: { status: 'FAILED', error: errorMessage },
          });
          this.logger.error(`Synchronous email send failed: ${errorMessage}`);
        }
      }

      return {
        success: true,
        emailLogId: emailLog.id,
        message: this.kafkaProducer.isKafkaEnabled()
          ? 'Email queued for delivery'
          : 'Email sent synchronously',
      };
    } catch (error) {
      this.logger.error(
        `Failed to queue email: ${error}`,
        error instanceof Error ? error.stack : undefined,
      );
      return {
        success: false,
        emailLogId: '',
        message: 'Failed to queue email. Please try again later.',
      };
    }
  }

  async sendBulkEmail(request: SendBulkEmailRequest): Promise<SendBulkEmailResponse> {
    const emails = request.emails || [];
    const results: Array<{
      toEmail: string;
      success: boolean;
      emailLogId: string;
      error?: string;
    }> = [];
    let queuedCount = 0;
    let failedCount = 0;

    // Process emails in batches with concurrency limit
    for (let i = 0; i < emails.length; i += BULK_EMAIL_CONCURRENCY_LIMIT) {
      const batch = emails.slice(i, i + BULK_EMAIL_CONCURRENCY_LIMIT);

      const batchResults = await Promise.allSettled(
        batch.map((email: BulkEmailItem) =>
          this.sendEmail({
            tenantId: request.tenantId,
            accountId: email.accountId,
            toEmail: email.toEmail,
            template: email.template,
            locale: email.locale,
            variables: email.variables,
            sourceService: request.sourceService,
            fromEmail: request.fromEmail,
            metadata: email.metadata,
          }),
        ),
      );

      // Process batch results
      batchResults.forEach((settledResult, index) => {
        const email = batch[index];
        if (settledResult.status === 'fulfilled') {
          const result = settledResult.value;
          results.push({
            toEmail: email.toEmail,
            success: result.success,
            emailLogId: result.emailLogId,
            error: result.success ? undefined : result.message,
          });
          if (result.success) {
            queuedCount++;
          } else {
            failedCount++;
          }
        } else {
          // Promise rejected
          results.push({
            toEmail: email.toEmail,
            success: false,
            emailLogId: '',
            error: settledResult.reason?.message || 'Unknown error',
          });
          failedCount++;
        }
      });
    }

    return {
      success: failedCount === 0,
      totalCount: emails.length,
      queuedCount,
      failedCount,
      results,
      message: `Queued ${queuedCount} emails, ${failedCount} failed`,
    };
  }

  async getEmailStatus(request: GetEmailStatusRequest): Promise<GetEmailStatusResponse> {
    const emailLog = await this.prisma.emailLog.findUnique({
      where: { id: request.emailLogId },
    });

    if (!emailLog) {
      return {
        emailLogId: request.emailLogId,
        tenantId: '',
        toEmail: '',
        template: EmailTemplate.EMAIL_TEMPLATE_UNSPECIFIED,
        status: EmailStatus.EMAIL_STATUS_UNSPECIFIED,
        sourceService: '',
        fromEmail: '',
        createdAt: '',
        error: 'Email log not found',
      };
    }

    return {
      emailLogId: emailLog.id,
      tenantId: emailLog.tenantId,
      toEmail: emailLog.toEmail,
      template: this.stringToTemplate(emailLog.template),
      status: this.statusToEnum(emailLog.status),
      sourceService: emailLog.sourceService,
      fromEmail: emailLog.fromEmail,
      sentAt: emailLog.sentAt?.toISOString(),
      openedAt: emailLog.openedAt?.toISOString(),
      clickedAt: emailLog.clickedAt?.toISOString(),
      error: emailLog.error || undefined,
      createdAt: emailLog.createdAt.toISOString(),
    };
  }

  async getInbox(request: GetInboxRequest): Promise<GetInboxResponse> {
    const page = request.page || 1;
    const pageSize = request.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const whereClause = {
      tenantId: request.tenantId,
      accountId: request.accountId,
      deletedAt: null,
      ...(request.includeRead ? {} : { readAt: null }),
    };

    const [items, totalCount, unreadCount] = await Promise.all([
      this.prisma.inbox.findMany({
        where: whereClause,
        include: { emailLog: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.inbox.count({ where: whereClause }),
      this.prisma.inbox.count({
        where: {
          tenantId: request.tenantId,
          accountId: request.accountId,
          deletedAt: null,
          readAt: null,
        },
      }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        emailLogId: item.emailLogId,
        subject: item.emailLog.subject,
        preview: (item.emailLog.body || item.emailLog.subject || '').substring(0, 100),
        template: this.stringToTemplate(item.emailLog.template),
        fromEmail: item.emailLog.fromEmail,
        sourceService: item.emailLog.sourceService,
        isRead: !!item.readAt,
        readAt: item.readAt?.toISOString(),
        createdAt: item.createdAt.toISOString(),
      })),
      totalCount,
      unreadCount,
      page,
      pageSize,
    };
  }

  async markAsRead(request: MarkAsReadRequest): Promise<MarkAsReadResponse> {
    try {
      const result = await this.prisma.inbox.updateMany({
        where: {
          id: { in: request.inboxIds },
          tenantId: request.tenantId,
          accountId: request.accountId,
          readAt: null,
        },
        data: {
          readAt: new Date(),
        },
      });

      return {
        success: true,
        updatedCount: result.count,
        message: `Marked ${result.count} items as read`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to mark as read: ${error}`,
        error instanceof Error ? error.stack : undefined,
      );
      return {
        success: false,
        updatedCount: 0,
        message: 'Failed to mark as read. Please try again later.',
      };
    }
  }
}
