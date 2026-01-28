import { Injectable, Logger } from '@nestjs/common';
import { MailGrpcClient, EmailTemplate } from '../../grpc-clients/mail.client';
import {
  ChannelDeliveryRequest,
  ChannelDeliveryResult,
  NotificationType,
} from '../../notification/notification.interface';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly mailClient: MailGrpcClient) {}

  /**
   * Send email notification via mail-service
   */
  async send(request: ChannelDeliveryRequest): Promise<ChannelDeliveryResult> {
    // Email address should be provided in the data field
    const toEmail = request.data?.email;

    if (!toEmail) {
      this.logger.warn('No email address provided for email notification');
      return {
        success: false,
        error: 'No email address provided',
      };
    }

    try {
      const response = await this.mailClient.sendEmail({
        tenantId: request.tenantId,
        accountId: request.accountId,
        toEmail,
        template: this.mapNotificationTypeToEmailTemplate(request.type),
        locale: request.locale || 'en',
        variables: request.data || {},
        sourceService: 'notification-service',
        fromEmail: request.data?.fromEmail || 'noreply@example.com',
        metadata: {
          notificationId: request.notificationId,
          notificationType: String(request.type),
        },
      });

      if (response.success) {
        this.logger.debug(`Email sent via mail-service: ${response.emailLogId}`);
        return {
          success: true,
          externalId: response.emailLogId,
        };
      } else {
        return {
          success: false,
          error: response.message,
        };
      }
    } catch (error) {
      this.logger.error(`Failed to send email: ${error}`);
      return {
        success: false,
        error: `Email error: ${error}`,
      };
    }
  }

  /**
   * Send email directly to an address
   */
  async sendToEmail(
    tenantId: string,
    accountId: string,
    toEmail: string,
    template: EmailTemplate,
    variables: Record<string, string>,
    locale: string = 'en',
  ): Promise<ChannelDeliveryResult> {
    try {
      const response = await this.mailClient.sendEmail({
        tenantId,
        accountId,
        toEmail,
        template,
        locale,
        variables,
        sourceService: 'notification-service',
        fromEmail: variables.fromEmail || 'noreply@example.com',
      });

      return {
        success: response.success,
        externalId: response.emailLogId,
        error: response.success ? undefined : response.message,
      };
    } catch (error) {
      this.logger.error(`Failed to send email: ${error}`);
      return {
        success: false,
        error: `Email error: ${error}`,
      };
    }
  }

  /**
   * Map notification type to email template
   */
  private mapNotificationTypeToEmailTemplate(type: NotificationType): EmailTemplate {
    const mapping: Record<NotificationType, EmailTemplate> = {
      [NotificationType.NOTIFICATION_TYPE_UNSPECIFIED]: EmailTemplate.EMAIL_TEMPLATE_UNSPECIFIED,
      [NotificationType.NOTIFICATION_TYPE_SYSTEM]: EmailTemplate.EMAIL_TEMPLATE_UNSPECIFIED,
      [NotificationType.NOTIFICATION_TYPE_ADMIN_INVITE]: EmailTemplate.EMAIL_TEMPLATE_ADMIN_INVITE,
      [NotificationType.NOTIFICATION_TYPE_PARTNER_INVITE]:
        EmailTemplate.EMAIL_TEMPLATE_PARTNER_INVITE,
      [NotificationType.NOTIFICATION_TYPE_PASSWORD_RESET]:
        EmailTemplate.EMAIL_TEMPLATE_PASSWORD_RESET,
      [NotificationType.NOTIFICATION_TYPE_SECURITY_ALERT]: EmailTemplate.EMAIL_TEMPLATE_UNSPECIFIED,
      [NotificationType.NOTIFICATION_TYPE_MFA_CODE]: EmailTemplate.EMAIL_TEMPLATE_MFA_CODE,
      [NotificationType.NOTIFICATION_TYPE_ACCOUNT_LOCKED]:
        EmailTemplate.EMAIL_TEMPLATE_ACCOUNT_LOCKED,
      [NotificationType.NOTIFICATION_TYPE_LOGIN_ALERT]: EmailTemplate.EMAIL_TEMPLATE_UNSPECIFIED,
      [NotificationType.NOTIFICATION_TYPE_MARKETING]: EmailTemplate.EMAIL_TEMPLATE_UNSPECIFIED,
    };

    return mapping[type] || EmailTemplate.EMAIL_TEMPLATE_UNSPECIFIED;
  }
}
