import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { EmailStatus } from '.prisma/mail-client';
import { getKafkaConfig, getConsumerGroupId, getTopics } from './kafka.config';
import { KafkaProducerService } from './kafka-producer.service';
import { SesService } from '../ses/ses.service';
import { TemplateService } from '../templates/template.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MailSendMessage } from './kafka.types';
import { EmailTemplate } from '../mail/mail.interface';

/**
 * Retry configuration
 */
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

/**
 * Kafka Consumer Service
 * Consumes email messages from Kafka and processes them via SES
 */
@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private kafka: Kafka;
  private consumer: Consumer;
  private isConnected = false;
  private readonly isEnabled: boolean;
  private readonly topics: ReturnType<typeof getTopics>;
  private readonly retryConfig: RetryConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly producerService: KafkaProducerService,
    private readonly sesService: SesService,
    private readonly templateService: TemplateService,
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
  ) {
    this.isEnabled = this.configService.get<string>('kafka.brokers') !== undefined;
    this.kafka = new Kafka(getKafkaConfig());
    this.consumer = this.kafka.consumer({
      groupId: getConsumerGroupId(),
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      maxBytesPerPartition: 1048576, // 1MB
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });
    this.topics = getTopics();
    this.retryConfig = {
      maxRetries: this.configService.get<number>('retry.maxAttempts', 3),
      baseDelayMs: this.configService.get<number>('retry.backoffMs', 1000),
      maxDelayMs: 30000,
    };
  }

  async onModuleInit(): Promise<void> {
    if (!this.isEnabled) {
      this.logger.warn('Kafka is disabled. Consumer will not start.');
      return;
    }

    try {
      await this.connect();
    } catch (error) {
      this.logger.error('Failed to connect Kafka consumer on startup', error);
      // Don't throw - allow service to start without Kafka
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  /**
   * Connect and start consuming
   */
  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      await this.consumer.connect();

      // Subscribe to mail.send topic
      await this.consumer.subscribe({
        topic: this.topics.MAIL_SEND,
        fromBeginning: false,
      });

      this.logger.log(`Subscribed to topic: ${this.topics.MAIL_SEND}`);

      // Start consuming
      await this.consumer.run({
        eachMessage: async (payload) => this.handleMessage(payload),
      });

      this.isConnected = true;
      this.logger.log('Kafka consumer connected and running');
    } catch (error) {
      this.logger.error('Failed to connect Kafka consumer', error);
      throw error;
    }
  }

  /**
   * Disconnect consumer
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.consumer.disconnect();
      this.isConnected = false;
      this.logger.log('Kafka consumer disconnected');
    } catch (error) {
      this.logger.error('Error disconnecting Kafka consumer', error);
    }
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;

    try {
      if (!message.value) {
        this.logger.warn(`Empty message received on ${topic}`);
        return;
      }

      const mailMessage: MailSendMessage = JSON.parse(message.value.toString());

      this.logger.debug(`Processing email message: ${mailMessage.id} [partition: ${partition}]`, {
        emailLogId: mailMessage.emailLogId,
        toEmail: mailMessage.toEmail,
      });

      await this.processEmailMessage(mailMessage);
    } catch (error) {
      this.logger.error(`Failed to process message on ${topic}`, error);
      // Don't throw - continue processing other messages
    }
  }

  /**
   * Process email message with retry logic
   */
  private async processEmailMessage(message: MailSendMessage): Promise<void> {
    try {
      // Render the template
      const templateName = this.templateService.templateEnumToName(message.template);
      const rendered = await this.templateService.render(
        templateName,
        message.locale,
        message.variables,
      );

      // Send via SES
      const result = await this.sesService.sendEmail({
        to: message.toEmail,
        from: message.fromEmail,
        subject: rendered.subject,
        htmlBody: rendered.body,
        emailLogId: message.emailLogId,
      });

      if (result.success) {
        // Update email log status to SENT
        await this.updateEmailStatus(message.emailLogId, EmailStatus.SENT, result.messageId);

        // Log to audit service for auth-related emails
        await this.logToAudit(message, true);

        this.logger.log(`Email sent successfully: ${message.emailLogId}`);
      } else {
        throw new Error(result.error || 'Failed to send email');
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to send email: ${message.emailLogId}`, err);

      // Check if we should retry
      if (message.retryCount < this.retryConfig.maxRetries) {
        await this.retryMessage(message, err);
      } else {
        // Max retries exceeded - send to DLQ
        await this.producerService.sendToDlq(message, err, this.topics.MAIL_SEND);
        await this.updateEmailStatus(
          message.emailLogId,
          EmailStatus.FAILED,
          undefined,
          err.message,
        );
        await this.logToAudit(message, false, err.message);
      }
    }
  }

  /**
   * Retry message with exponential backoff
   */
  private async retryMessage(message: MailSendMessage, _error: Error): Promise<void> {
    const retryCount = message.retryCount + 1;
    const delay = this.calculateBackoff(retryCount);

    this.logger.warn(
      `Retrying email ${message.emailLogId}, attempt ${retryCount}/${this.retryConfig.maxRetries}, delay: ${delay}ms`,
    );

    // Wait for backoff delay
    await this.sleep(delay);

    // Republish message with incremented retry count
    const retryMessage: MailSendMessage = {
      ...message,
      retryCount,
      timestamp: new Date().toISOString(),
    };

    await this.producerService.publishMailSend(retryMessage);
  }

  /**
   * Calculate exponential backoff with jitter
   */
  private calculateBackoff(retryCount: number): number {
    const baseDelay = this.retryConfig.baseDelayMs * Math.pow(2, retryCount - 1);
    const jitter = Math.random() * 0.3 * baseDelay; // 30% jitter
    return Math.min(baseDelay + jitter, this.retryConfig.maxDelayMs);
  }

  /**
   * Update email log status in database
   */
  private async updateEmailStatus(
    emailLogId: string,
    status: EmailStatus,
    messageId?: string,
    error?: string,
  ): Promise<void> {
    try {
      await this.prismaService.emailLog.update({
        where: { id: emailLogId },
        data: {
          status,
          sentAt: status === EmailStatus.SENT ? new Date() : undefined,
          messageId,
          error,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to update email status: ${emailLogId}`, error);
    }
  }

  /**
   * Log auth-related emails to audit service
   */
  private async logToAudit(
    message: MailSendMessage,
    success: boolean,
    errorMessage?: string,
  ): Promise<void> {
    // Only log auth-related templates
    const authTemplates = [
      EmailTemplate.EMAIL_TEMPLATE_PASSWORD_RESET,
      EmailTemplate.EMAIL_TEMPLATE_EMAIL_VERIFICATION,
      EmailTemplate.EMAIL_TEMPLATE_MFA_CODE,
      EmailTemplate.EMAIL_TEMPLATE_ACCOUNT_LOCKED,
      EmailTemplate.EMAIL_TEMPLATE_ACCOUNT_UNLOCKED,
      EmailTemplate.EMAIL_TEMPLATE_ADMIN_INVITE,
      EmailTemplate.EMAIL_TEMPLATE_PARTNER_INVITE,
    ];

    if (!authTemplates.includes(message.template)) {
      return;
    }

    try {
      await this.auditService.logEmailSent({
        tenantId: message.tenantId,
        accountId: message.accountId,
        template: this.templateService.templateEnumToName(message.template),
        toEmail: message.toEmail,
        success,
        errorMessage,
        emailLogId: message.emailLogId,
      });
    } catch (error) {
      // Don't fail the email send if audit logging fails
      this.logger.warn(`Failed to log email to audit service: ${message.emailLogId}`, error);
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if consumer is connected
   */
  isConsumerConnected(): boolean {
    return this.isConnected;
  }
}
