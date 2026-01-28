/**
 * Mail Service gRPC Client
 *
 * Provides a typed client for calling the MailService via gRPC.
 * Used for sending emails, checking email status, and managing inbox.
 *
 * Includes enterprise-grade resilience patterns:
 * - Exponential backoff with jitter
 * - Circuit breaker
 * - Request timeout
 *
 * @see packages/proto/mail/v1/mail.proto
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { GRPC_SERVICES, DEFAULT_GRPC_TIMEOUT } from './grpc.options';
import {
  createGrpcResilience,
  GrpcResilience,
  ResilientCallOptions,
  grpcHealthAggregator,
  CircuitBreakerMetrics,
} from './grpc-resilience.util';
import { ProtoTimestamp } from './grpc.types';

// ============================================================================
// Mail Service Types
// ============================================================================

export enum EmailTemplate {
  EMAIL_TEMPLATE_UNSPECIFIED = 0,
  EMAIL_TEMPLATE_ADMIN_INVITE = 1,
  EMAIL_TEMPLATE_PARTNER_INVITE = 2,
  EMAIL_TEMPLATE_PASSWORD_RESET = 3,
  EMAIL_TEMPLATE_WELCOME = 4,
  EMAIL_TEMPLATE_EMAIL_VERIFICATION = 5,
  EMAIL_TEMPLATE_MFA_CODE = 6,
  EMAIL_TEMPLATE_ACCOUNT_LOCKED = 7,
  EMAIL_TEMPLATE_ACCOUNT_UNLOCKED = 8,
}

export enum EmailStatus {
  EMAIL_STATUS_UNSPECIFIED = 0,
  EMAIL_STATUS_PENDING = 1,
  EMAIL_STATUS_SENT = 2,
  EMAIL_STATUS_FAILED = 3,
  EMAIL_STATUS_BOUNCED = 4,
  EMAIL_STATUS_OPENED = 5,
  EMAIL_STATUS_CLICKED = 6,
}

// Request/Response Types
export interface SendEmailRequest {
  tenant_id: string;
  account_id?: string;
  to_email: string;
  template: EmailTemplate;
  locale: string;
  variables: Record<string, string>;
  source_service: string;
  from_email: string;
  metadata?: Record<string, string>;
}

export interface SendEmailResponse {
  success: boolean;
  email_log_id: string;
  message: string;
}

export interface BulkEmailItem {
  account_id?: string;
  to_email: string;
  template: EmailTemplate;
  locale: string;
  variables: Record<string, string>;
  metadata?: Record<string, string>;
}

export interface SendBulkEmailRequest {
  tenant_id: string;
  emails: BulkEmailItem[];
  source_service: string;
  from_email: string;
}

export interface BulkEmailResult {
  to_email: string;
  success: boolean;
  email_log_id: string;
  error?: string;
}

export interface SendBulkEmailResponse {
  success: boolean;
  total_count: number;
  queued_count: number;
  failed_count: number;
  results: BulkEmailResult[];
  message: string;
}

export interface GetEmailStatusRequest {
  email_log_id: string;
}

export interface GetEmailStatusResponse {
  email_log_id: string;
  tenant_id: string;
  to_email: string;
  template: EmailTemplate;
  status: EmailStatus;
  source_service: string;
  from_email: string;
  sent_at?: ProtoTimestamp;
  opened_at?: ProtoTimestamp;
  clicked_at?: ProtoTimestamp;
  error?: string;
  created_at?: ProtoTimestamp;
}

export interface GetInboxRequest {
  tenant_id: string;
  account_id: string;
  page: number;
  page_size: number;
  include_read: boolean;
}

export interface InboxItem {
  id: string;
  email_log_id: string;
  subject: string;
  preview: string;
  template: EmailTemplate;
  from_email: string;
  source_service: string;
  is_read: boolean;
  read_at?: ProtoTimestamp;
  created_at?: ProtoTimestamp;
}

export interface GetInboxResponse {
  items: InboxItem[];
  total_count: number;
  unread_count: number;
  page: number;
  page_size: number;
}

export interface MarkAsReadRequest {
  tenant_id: string;
  account_id: string;
  inbox_ids: string[];
}

export interface MarkAsReadResponse {
  success: boolean;
  updated_count: number;
  message: string;
}

// Service Interface
export interface IMailService {
  sendEmail(request: SendEmailRequest): Observable<SendEmailResponse>;
  sendBulkEmail(request: SendBulkEmailRequest): Observable<SendBulkEmailResponse>;
  getEmailStatus(request: GetEmailStatusRequest): Observable<GetEmailStatusResponse>;
  getInbox(request: GetInboxRequest): Observable<GetInboxResponse>;
  markAsRead(request: MarkAsReadRequest): Observable<MarkAsReadResponse>;
}

/**
 * Mail Service gRPC Client
 *
 * Usage:
 * ```typescript
 * @Module({
 *   imports: [GrpcClientsModule.forRoot({ mail: true })],
 * })
 * export class AppModule {}
 *
 * @Injectable()
 * class NotificationService {
 *   constructor(private readonly mailClient: MailGrpcClient) {}
 *
 *   async sendPasswordResetEmail(email: string, resetToken: string) {
 *     const response = await this.mailClient.sendEmail({
 *       tenant_id: 'default',
 *       to_email: email,
 *       template: EmailTemplate.EMAIL_TEMPLATE_PASSWORD_RESET,
 *       locale: 'en',
 *       variables: { reset_token: resetToken },
 *       source_service: 'notification-service',
 *       from_email: 'noreply@example.com',
 *     });
 *     return response;
 *   }
 * }
 * ```
 */
@Injectable()
export class MailGrpcClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MailGrpcClient.name);
  private mailService!: IMailService;
  private resilience!: GrpcResilience;
  private timeoutMs = DEFAULT_GRPC_TIMEOUT;

  constructor(
    @Inject(GRPC_SERVICES.MAIL)
    private readonly client: ClientGrpc,
  ) {}

  onModuleInit() {
    this.mailService = this.client.getService<IMailService>('MailService');
    this.resilience = createGrpcResilience('MailService', {
      timeoutMs: this.timeoutMs,
    });
    grpcHealthAggregator.register('MailService', this.resilience);
    this.logger.log('MailGrpcClient initialized with resilience patterns');
  }

  onModuleDestroy() {
    grpcHealthAggregator.unregister('MailService');
  }

  /**
   * Set request timeout (in milliseconds)
   */
  setTimeout(ms: number): this {
    this.timeoutMs = ms;
    return this;
  }

  /**
   * Get circuit breaker metrics for monitoring
   */
  getCircuitBreakerMetrics(): CircuitBreakerMetrics {
    return this.resilience.getMetrics();
  }

  /**
   * Reset circuit breaker (use for manual recovery)
   */
  resetCircuitBreaker(): void {
    this.resilience.reset();
    this.logger.log('MailGrpcClient circuit breaker reset');
  }

  // ============================================================================
  // Email Operations
  // ============================================================================

  /**
   * Send a single email
   */
  async sendEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
    return this.call('SendEmail', () => this.mailService.sendEmail(request));
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmail(request: SendBulkEmailRequest): Promise<SendBulkEmailResponse> {
    return this.call('SendBulkEmail', () => this.mailService.sendBulkEmail(request));
  }

  /**
   * Get email status by ID
   */
  async getEmailStatus(request: GetEmailStatusRequest): Promise<GetEmailStatusResponse> {
    return this.call('GetEmailStatus', () => this.mailService.getEmailStatus(request));
  }

  // ============================================================================
  // Inbox Operations
  // ============================================================================

  /**
   * Get inbox for an account
   */
  async getInbox(request: GetInboxRequest): Promise<GetInboxResponse> {
    return this.call('GetInbox', () => this.mailService.getInbox(request));
  }

  /**
   * Mark inbox items as read
   */
  async markAsRead(request: MarkAsReadRequest): Promise<MarkAsReadResponse> {
    return this.call('MarkAsRead', () => this.mailService.markAsRead(request));
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Execute a gRPC call with resilience patterns (retry, circuit breaker, timeout)
   */
  private async call<T>(
    methodName: string,
    fn: () => Observable<T>,
    options?: ResilientCallOptions,
  ): Promise<T> {
    this.logger.debug(`Calling MailService.${methodName}`);

    try {
      return await this.resilience.execute(fn, {
        timeoutMs: this.timeoutMs,
        ...options,
      });
    } catch (error) {
      this.logger.error(`MailService.${methodName} failed`, {
        error: error instanceof Error ? error.message : String(error),
        circuitState: this.resilience.getMetrics().state,
      });
      throw error;
    }
  }
}
