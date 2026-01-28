import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SESClient,
  SendEmailCommand,
  SendEmailCommandInput,
  SendEmailCommandOutput,
  MessageRejected,
  MailFromDomainNotVerifiedException,
  ConfigurationSetDoesNotExistException,
} from '@aws-sdk/client-ses';

/**
 * Email send request
 */
export interface SendEmailRequest {
  /** Recipient email address */
  to: string;

  /** Sender email address */
  from: string;

  /** Email subject */
  subject: string;

  /** HTML body content */
  htmlBody: string;

  /** Plain text body (optional) */
  textBody?: string;

  /** Reply-to address (optional) */
  replyTo?: string;

  /** Email log ID for tracking */
  emailLogId?: string;

  /** CC recipients (optional) */
  cc?: string[];

  /** BCC recipients (optional) */
  bcc?: string[];
}

/**
 * Email send response
 */
export interface SendEmailResponse {
  /** Whether the send was successful */
  success: boolean;

  /** SES Message ID */
  messageId?: string;

  /** Error message if failed */
  error?: string;

  /** Error code if failed */
  errorCode?: string;
}

/**
 * SES Service
 * Handles sending emails via AWS SES
 */
@Injectable()
export class SesService implements OnModuleInit {
  private readonly logger = new Logger(SesService.name);
  private sesClient: SESClient;
  private readonly configurationSet: string;
  private readonly defaultFromEmail: string;
  private readonly isEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.configurationSet = this.configService.get<string>('ses.configurationSet', 'mail-tracking');
    this.defaultFromEmail = this.configService.get<string>(
      'ses.fromAddresses.default',
      'noreply@example.com',
    );

    // Check if AWS credentials are configured
    const accessKeyId = this.configService.get<string>('ses.accessKeyId');
    const secretAccessKey = this.configService.get<string>('ses.secretAccessKey');
    this.isEnabled = !!(accessKeyId && secretAccessKey);

    // Initialize SES client
    this.sesClient = new SESClient({
      region: this.configService.get<string>('ses.region', 'ap-northeast-2'),
      credentials:
        accessKeyId && secretAccessKey
          ? {
              accessKeyId,
              secretAccessKey,
            }
          : undefined,
    });
  }

  async onModuleInit(): Promise<void> {
    if (!this.isEnabled) {
      this.logger.warn('AWS SES is not configured. Emails will be logged but not sent.');
      return;
    }

    this.logger.log(`SES Service initialized with configuration set: ${this.configurationSet}`);
  }

  /**
   * Send an email via AWS SES
   */
  async sendEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
    if (!this.isEnabled) {
      this.logger.log(`[DRY RUN] Would send email to: ${request.to}`, {
        subject: request.subject,
        from: request.from,
        emailLogId: request.emailLogId,
      });

      return {
        success: true,
        messageId: `dry-run-${Date.now()}`,
      };
    }

    const input: SendEmailCommandInput = {
      Source: request.from || this.defaultFromEmail,
      Destination: {
        ToAddresses: [request.to],
        CcAddresses: request.cc,
        BccAddresses: request.bcc,
      },
      Message: {
        Subject: {
          Data: request.subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: request.htmlBody,
            Charset: 'UTF-8',
          },
          ...(request.textBody && {
            Text: {
              Data: request.textBody,
              Charset: 'UTF-8',
            },
          }),
        },
      },
      ReplyToAddresses: request.replyTo ? [request.replyTo] : undefined,
      ConfigurationSetName: this.configurationSet,
      Tags: request.emailLogId
        ? [
            {
              Name: 'emailLogId',
              Value: request.emailLogId,
            },
          ]
        : undefined,
    };

    try {
      const command = new SendEmailCommand(input);
      const response: SendEmailCommandOutput = await this.sesClient.send(command);

      this.logger.log(`Email sent successfully: ${response.MessageId}`, {
        to: request.to,
        subject: request.subject,
        emailLogId: request.emailLogId,
      });

      return {
        success: true,
        messageId: response.MessageId,
      };
    } catch (error) {
      return this.handleSesError(error, request);
    }
  }

  /**
   * Handle SES errors and return appropriate response
   */
  private handleSesError(error: unknown, request: SendEmailRequest): SendEmailResponse {
    if (error instanceof MessageRejected) {
      this.logger.error(`Email rejected by SES: ${error.message}`, {
        to: request.to,
        emailLogId: request.emailLogId,
      });
      return {
        success: false,
        error: 'Email rejected by SES',
        errorCode: 'MESSAGE_REJECTED',
      };
    }

    if (error instanceof MailFromDomainNotVerifiedException) {
      this.logger.error(`Mail from domain not verified: ${error.message}`, {
        from: request.from,
        emailLogId: request.emailLogId,
      });
      return {
        success: false,
        error: 'Sender domain not verified in SES',
        errorCode: 'DOMAIN_NOT_VERIFIED',
      };
    }

    if (error instanceof ConfigurationSetDoesNotExistException) {
      this.logger.error(`Configuration set does not exist: ${this.configurationSet}`, {
        emailLogId: request.emailLogId,
      });
      return {
        success: false,
        error: 'SES configuration set not found',
        errorCode: 'CONFIG_SET_NOT_FOUND',
      };
    }

    // Generic error handling
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logger.error(`Failed to send email: ${errorMessage}`, {
      to: request.to,
      emailLogId: request.emailLogId,
      error,
    });

    return {
      success: false,
      error: errorMessage,
      errorCode: 'SEND_FAILED',
    };
  }

  /**
   * Verify an email address in SES (for testing)
   */
  async verifyEmailIdentity(email: string): Promise<boolean> {
    if (!this.isEnabled) {
      this.logger.warn(`[DRY RUN] Would verify email: ${email}`);
      return true;
    }

    try {
      const { VerifyEmailIdentityCommand } = await import('@aws-sdk/client-ses');
      const command = new VerifyEmailIdentityCommand({
        EmailAddress: email,
      });
      await this.sesClient.send(command);
      this.logger.log(`Verification email sent to: ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send verification email: ${error}`);
      return false;
    }
  }

  /**
   * Check if SES is configured and enabled
   */
  isSesEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Get the default from email address
   */
  getDefaultFromEmail(): string {
    return this.defaultFromEmail;
  }
}
