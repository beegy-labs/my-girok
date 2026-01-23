/**
 * Audit Service gRPC Client
 *
 * Provides a typed client for calling the AuditService via gRPC.
 * Used for logging authentication events, security events, and admin actions.
 *
 * Includes enterprise-grade resilience patterns:
 * - Exponential backoff with jitter
 * - Circuit breaker
 * - Request timeout
 *
 * @see packages/proto/audit/v1/audit.proto
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
// Audit Service Types
// ============================================================================

export enum AuthEventType {
  AUTH_EVENT_TYPE_UNSPECIFIED = 0,
  AUTH_EVENT_TYPE_LOGIN_SUCCESS = 1,
  AUTH_EVENT_TYPE_LOGIN_FAILED = 2,
  AUTH_EVENT_TYPE_LOGIN_BLOCKED = 3,
  AUTH_EVENT_TYPE_LOGOUT = 4,
  AUTH_EVENT_TYPE_SESSION_EXPIRED = 5,
  AUTH_EVENT_TYPE_SESSION_REVOKED = 6,
  AUTH_EVENT_TYPE_MFA_SETUP = 7,
  AUTH_EVENT_TYPE_MFA_VERIFIED = 8,
  AUTH_EVENT_TYPE_MFA_FAILED = 9,
  AUTH_EVENT_TYPE_MFA_DISABLED = 10,
  AUTH_EVENT_TYPE_BACKUP_CODE_USED = 11,
  AUTH_EVENT_TYPE_BACKUP_CODES_REGENERATED = 12,
  AUTH_EVENT_TYPE_PASSWORD_CHANGED = 13,
  AUTH_EVENT_TYPE_PASSWORD_RESET = 14,
  AUTH_EVENT_TYPE_PASSWORD_RESET_REQUESTED = 15,
  AUTH_EVENT_TYPE_ACCOUNT_CREATED = 16,
  AUTH_EVENT_TYPE_ACCOUNT_LOCKED = 17,
  AUTH_EVENT_TYPE_ACCOUNT_UNLOCKED = 18,
  AUTH_EVENT_TYPE_ACCOUNT_DELETED = 19,
  AUTH_EVENT_TYPE_TOKEN_REFRESHED = 20,
  AUTH_EVENT_TYPE_TOKEN_REVOKED = 21,
  AUTH_EVENT_TYPE_OPERATOR_ASSIGNED = 22,
  AUTH_EVENT_TYPE_OPERATOR_REVOKED = 23,
  AUTH_EVENT_TYPE_OPERATOR_LOGIN = 24,
  AUTH_EVENT_TYPE_OPERATOR_LOGOUT = 25,
  // Email events
  AUTH_EVENT_TYPE_EMAIL_VERIFICATION_SENT = 26,
  AUTH_EVENT_TYPE_EMAIL_VERIFICATION_CLICKED = 27,
  AUTH_EVENT_TYPE_PASSWORD_RESET_EMAIL_SENT = 28,
  AUTH_EVENT_TYPE_PASSWORD_RESET_EMAIL_CLICKED = 29,
  AUTH_EVENT_TYPE_MFA_CODE_EMAIL_SENT = 30,
  AUTH_EVENT_TYPE_ACCOUNT_LOCKED_EMAIL_SENT = 31,
  AUTH_EVENT_TYPE_ACCOUNT_UNLOCKED_EMAIL_SENT = 32,
  AUTH_EVENT_TYPE_ADMIN_INVITE_EMAIL_SENT = 33,
  AUTH_EVENT_TYPE_PARTNER_INVITE_EMAIL_SENT = 34,
}

export enum AccountType {
  ACCOUNT_TYPE_UNSPECIFIED = 0,
  ACCOUNT_TYPE_USER = 1,
  ACCOUNT_TYPE_OPERATOR = 2,
  ACCOUNT_TYPE_ADMIN = 3,
}

export enum AuthEventResult {
  AUTH_EVENT_RESULT_UNSPECIFIED = 0,
  AUTH_EVENT_RESULT_SUCCESS = 1,
  AUTH_EVENT_RESULT_FAILURE = 2,
  AUTH_EVENT_RESULT_BLOCKED = 3,
}

export enum SecurityEventType {
  SECURITY_EVENT_TYPE_UNSPECIFIED = 0,
  SECURITY_EVENT_TYPE_SUSPICIOUS_LOGIN = 1,
  SECURITY_EVENT_TYPE_BRUTE_FORCE_ATTEMPT = 2,
  SECURITY_EVENT_TYPE_CREDENTIAL_STUFFING = 3,
  SECURITY_EVENT_TYPE_RATE_LIMIT_EXCEEDED = 4,
  SECURITY_EVENT_TYPE_IP_BLOCKED = 5,
  SECURITY_EVENT_TYPE_IP_UNBLOCKED = 6,
  SECURITY_EVENT_TYPE_SESSION_HIJACK_ATTEMPT = 7,
  SECURITY_EVENT_TYPE_CONCURRENT_SESSION_LIMIT = 8,
  SECURITY_EVENT_TYPE_TOKEN_REUSE_DETECTED = 9,
  SECURITY_EVENT_TYPE_IMPOSSIBLE_TRAVEL = 10,
  SECURITY_EVENT_TYPE_NEW_COUNTRY_LOGIN = 11,
  SECURITY_EVENT_TYPE_NEW_DEVICE_LOGIN = 12,
  SECURITY_EVENT_TYPE_SENSITIVE_DATA_ACCESS = 13,
  SECURITY_EVENT_TYPE_BULK_DATA_EXPORT = 14,
  // Email delivery issues
  SECURITY_EVENT_TYPE_EMAIL_HARD_BOUNCE = 15,
  SECURITY_EVENT_TYPE_EMAIL_SOFT_BOUNCE = 16,
  SECURITY_EVENT_TYPE_EMAIL_COMPLAINT = 17,
  SECURITY_EVENT_TYPE_EMAIL_DELIVERY_FAILED = 18,
}

export enum SecurityEventSeverity {
  SECURITY_EVENT_SEVERITY_UNSPECIFIED = 0,
  SECURITY_EVENT_SEVERITY_INFO = 1,
  SECURITY_EVENT_SEVERITY_LOW = 2,
  SECURITY_EVENT_SEVERITY_MEDIUM = 3,
  SECURITY_EVENT_SEVERITY_HIGH = 4,
  SECURITY_EVENT_SEVERITY_CRITICAL = 5,
}

// Request/Response Types
export interface LogAuthEventRequest {
  tenant_id: string;
  event_type: AuthEventType;
  account_type: AccountType;
  account_id: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  device_fingerprint?: string;
  country_code?: string;
  result: AuthEventResult;
  failure_reason?: string;
  metadata?: Record<string, string>;
  source_service?: string;
}

export interface LogAuthEventResponse {
  success: boolean;
  event_id: string;
  message: string;
}

export interface LogSecurityEventRequest {
  tenant_id: string;
  event_type: SecurityEventType;
  severity: SecurityEventSeverity;
  subject_id: string;
  subject_type: AccountType;
  ip_address?: string;
  user_agent?: string;
  country_code?: string;
  description: string;
  metadata?: Record<string, string>;
  action_taken: boolean;
  action_description?: string;
  source_service?: string;
}

export interface LogSecurityEventResponse {
  success: boolean;
  event_id: string;
  message: string;
}

export interface GetAuthEventsRequest {
  account_id?: string;
  account_type?: AccountType;
  event_type?: AuthEventType;
  result?: AuthEventResult;
  ip_address?: string;
  session_id?: string;
  start_time?: ProtoTimestamp;
  end_time?: ProtoTimestamp;
  page: number;
  page_size: number;
  order_by?: string;
  descending?: boolean;
  tenant_id?: string;
}

export interface AuthEvent {
  id: string;
  event_type: AuthEventType;
  account_type: AccountType;
  account_id: string;
  session_id: string;
  ip_address: string;
  user_agent: string;
  device_fingerprint: string;
  country_code: string;
  result: AuthEventResult;
  failure_reason: string;
  metadata: Record<string, string>;
  timestamp?: ProtoTimestamp;
}

export interface GetAuthEventsResponse {
  events: AuthEvent[];
  total_count: number;
  page: number;
  page_size: number;
}

// Service Interface
export interface IAuditService {
  logAuthEvent(request: LogAuthEventRequest): Observable<LogAuthEventResponse>;
  getAuthEvents(request: GetAuthEventsRequest): Observable<GetAuthEventsResponse>;
  logSecurityEvent(request: LogSecurityEventRequest): Observable<LogSecurityEventResponse>;
}

/**
 * Audit Service gRPC Client
 *
 * Usage:
 * ```typescript
 * @Module({
 *   imports: [GrpcClientsModule.forRoot({ audit: true })],
 * })
 * export class AppModule {}
 *
 * @Injectable()
 * class SomeService {
 *   constructor(private readonly auditClient: AuditGrpcClient) {}
 *
 *   async logEmailSent(accountId: string, template: string) {
 *     await this.auditClient.logAuthEvent({
 *       tenant_id: 'default',
 *       event_type: AuthEventType.AUTH_EVENT_TYPE_PASSWORD_RESET_EMAIL_SENT,
 *       account_type: AccountType.ACCOUNT_TYPE_USER,
 *       account_id: accountId,
 *       result: AuthEventResult.AUTH_EVENT_RESULT_SUCCESS,
 *       metadata: { template },
 *       source_service: 'mail-service',
 *     });
 *   }
 * }
 * ```
 */
@Injectable()
export class AuditGrpcClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditGrpcClient.name);
  private auditService!: IAuditService;
  private resilience!: GrpcResilience;
  private timeoutMs = DEFAULT_GRPC_TIMEOUT;

  constructor(
    @Inject(GRPC_SERVICES.AUDIT)
    private readonly client: ClientGrpc,
  ) {}

  onModuleInit() {
    this.auditService = this.client.getService<IAuditService>('AuditService');
    this.resilience = createGrpcResilience('AuditService', {
      timeoutMs: this.timeoutMs,
    });
    grpcHealthAggregator.register('AuditService', this.resilience);
    this.logger.log('AuditGrpcClient initialized with resilience patterns');
  }

  onModuleDestroy() {
    grpcHealthAggregator.unregister('AuditService');
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
    this.logger.log('AuditGrpcClient circuit breaker reset');
  }

  // ============================================================================
  // Auth Event Operations
  // ============================================================================

  /**
   * Log an authentication event
   */
  async logAuthEvent(request: LogAuthEventRequest): Promise<LogAuthEventResponse> {
    return this.call('LogAuthEvent', () => this.auditService.logAuthEvent(request));
  }

  /**
   * Get authentication events with filters
   */
  async getAuthEvents(request: GetAuthEventsRequest): Promise<GetAuthEventsResponse> {
    return this.call('GetAuthEvents', () => this.auditService.getAuthEvents(request));
  }

  // ============================================================================
  // Security Event Operations
  // ============================================================================

  /**
   * Log a security event
   */
  async logSecurityEvent(request: LogSecurityEventRequest): Promise<LogSecurityEventResponse> {
    return this.call('LogSecurityEvent', () => this.auditService.logSecurityEvent(request));
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
    this.logger.debug(`Calling AuditService.${methodName}`);

    try {
      return await this.resilience.execute(fn, {
        timeoutMs: this.timeoutMs,
        ...options,
      });
    } catch (error) {
      this.logger.error(`AuditService.${methodName} failed`, {
        error: error instanceof Error ? error.message : String(error),
        circuitState: this.resilience.getMetrics().state,
      });
      throw error;
    }
  }
}
