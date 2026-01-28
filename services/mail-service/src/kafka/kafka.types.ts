import { EmailTemplate } from '../mail/mail.interface';

/**
 * Kafka message for sending email
 */
export interface MailSendMessage {
  /** Unique message ID */
  id: string;

  /** Email log ID for tracking */
  emailLogId: string;

  /** Tenant ID */
  tenantId: string;

  /** Account ID (optional) */
  accountId?: string;

  /** Recipient email address */
  toEmail: string;

  /** Sender email address */
  fromEmail: string;

  /** Email template */
  template: EmailTemplate;

  /** Locale for template rendering */
  locale: string;

  /** Template variables */
  variables: Record<string, string>;

  /** Source service that requested the email */
  sourceService: string;

  /** Additional metadata */
  metadata?: Record<string, string>;

  /** Retry count */
  retryCount: number;

  /** Timestamp */
  timestamp: string;
}

/**
 * Kafka message for email status update
 */
export interface MailStatusMessage {
  /** Message ID */
  id: string;

  /** Email log ID */
  emailLogId: string;

  /** Event type */
  eventType: 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'failed';

  /** Event timestamp */
  timestamp: string;

  /** Additional details */
  details?: Record<string, unknown>;
}

/**
 * DLQ message with error information
 */
export interface MailDlqMessage extends MailSendMessage {
  /** Original error message */
  errorMessage: string;

  /** Error stack trace */
  errorStack?: string;

  /** DLQ timestamp */
  dlqTimestamp: string;

  /** Original topic */
  originalTopic: string;
}
