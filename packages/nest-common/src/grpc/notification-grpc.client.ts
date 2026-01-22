/**
 * Notification Service gRPC Client
 *
 * Provides a typed client for calling the NotificationService via gRPC.
 * Used for sending notifications, managing preferences, device tokens, and quiet hours.
 *
 * Includes enterprise-grade resilience patterns:
 * - Exponential backoff with jitter
 * - Circuit breaker
 * - Request timeout
 *
 * @see packages/proto/notification/v1/notification.proto
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
// Notification Service Types
// ============================================================================

export enum NotificationChannel {
  NOTIFICATION_CHANNEL_UNSPECIFIED = 0,
  NOTIFICATION_CHANNEL_IN_APP = 1,
  NOTIFICATION_CHANNEL_PUSH = 2,
  NOTIFICATION_CHANNEL_SMS = 3,
  NOTIFICATION_CHANNEL_EMAIL = 4,
}

export enum NotificationType {
  NOTIFICATION_TYPE_UNSPECIFIED = 0,
  NOTIFICATION_TYPE_SYSTEM = 1,
  NOTIFICATION_TYPE_ADMIN_INVITE = 2,
  NOTIFICATION_TYPE_PARTNER_INVITE = 3,
  NOTIFICATION_TYPE_PASSWORD_RESET = 4,
  NOTIFICATION_TYPE_SECURITY_ALERT = 5,
  NOTIFICATION_TYPE_MFA_CODE = 6,
  NOTIFICATION_TYPE_ACCOUNT_LOCKED = 7,
  NOTIFICATION_TYPE_LOGIN_ALERT = 8,
  NOTIFICATION_TYPE_MARKETING = 9,
}

export enum NotificationStatus {
  NOTIFICATION_STATUS_UNSPECIFIED = 0,
  NOTIFICATION_STATUS_PENDING = 1,
  NOTIFICATION_STATUS_SENT = 2,
  NOTIFICATION_STATUS_DELIVERED = 3,
  NOTIFICATION_STATUS_FAILED = 4,
  NOTIFICATION_STATUS_READ = 5,
}

export enum Priority {
  PRIORITY_UNSPECIFIED = 0,
  PRIORITY_LOW = 1,
  PRIORITY_NORMAL = 2,
  PRIORITY_HIGH = 3,
  PRIORITY_URGENT = 4,
}

export enum Platform {
  PLATFORM_UNSPECIFIED = 0,
  PLATFORM_IOS = 1,
  PLATFORM_ANDROID = 2,
  PLATFORM_WEB = 3,
}

// Core Notification Types
export interface SendNotificationRequest {
  tenant_id: string;
  account_id: string;
  type: NotificationType;
  channels: NotificationChannel[];
  title: string;
  body: string;
  locale: string;
  data?: Record<string, string>;
  source_service: string;
  priority?: Priority;
  idempotency_key?: string;
  expires_at?: ProtoTimestamp;
}

export interface SendNotificationResponse {
  success: boolean;
  notification_id: string;
  message: string;
}

export interface BulkNotificationItem {
  account_id: string;
  type: NotificationType;
  channels: NotificationChannel[];
  title: string;
  body: string;
  locale: string;
  data?: Record<string, string>;
  priority?: Priority;
  idempotency_key?: string;
}

export interface SendBulkNotificationRequest {
  tenant_id: string;
  notifications: BulkNotificationItem[];
  source_service: string;
}

export interface BulkNotificationResult {
  account_id: string;
  success: boolean;
  notification_id: string;
  error?: string;
}

export interface SendBulkNotificationResponse {
  success: boolean;
  total_count: number;
  sent_count: number;
  failed_count: number;
  results: BulkNotificationResult[];
}

export interface GetNotificationsRequest {
  tenant_id: string;
  account_id: string;
  channel?: NotificationChannel;
  unread_only?: boolean;
  page: number;
  page_size: number;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  body: string;
  data?: Record<string, string>;
  status: NotificationStatus;
  source_service: string;
  priority: Priority;
  read_at?: ProtoTimestamp;
  created_at?: ProtoTimestamp;
}

export interface GetNotificationsResponse {
  notifications: NotificationItem[];
  total_count: number;
  unread_count: number;
  page: number;
  page_size: number;
}

export interface MarkAsReadRequest {
  tenant_id: string;
  account_id: string;
  notification_ids: string[];
}

export interface MarkAsReadResponse {
  success: boolean;
  updated_count: number;
}

export interface GetNotificationStatusRequest {
  notification_id: string;
}

export interface GetNotificationStatusResponse {
  notification_id: string;
  status: NotificationStatus;
  channel: string;
  external_id?: string;
  sent_at?: ProtoTimestamp;
  delivered_at?: ProtoTimestamp;
  error?: string;
  retry_count: number;
}

// Preferences Types
export interface ChannelPreference {
  channel: NotificationChannel;
  enabled: boolean;
}

export interface TypePreference {
  type: NotificationType;
  enabled_channels: NotificationChannel[];
}

export interface GetPreferencesRequest {
  tenant_id: string;
  account_id: string;
}

export interface GetPreferencesResponse {
  channel_preferences: ChannelPreference[];
  type_preferences: TypePreference[];
}

export interface UpdatePreferencesRequest {
  tenant_id: string;
  account_id: string;
  channel_preferences: ChannelPreference[];
  type_preferences: TypePreference[];
}

export interface UpdatePreferencesResponse {
  success: boolean;
  message: string;
}

// Device Token Types
export interface RegisterDeviceTokenRequest {
  tenant_id: string;
  account_id: string;
  token: string;
  platform: Platform;
  device_id?: string;
  device_info?: Record<string, string>;
}

export interface RegisterDeviceTokenResponse {
  success: boolean;
  device_token_id: string;
  message: string;
}

export interface UnregisterDeviceTokenRequest {
  tenant_id: string;
  account_id: string;
  token: string;
}

export interface UnregisterDeviceTokenResponse {
  success: boolean;
  message: string;
}

export interface GetDeviceTokensRequest {
  tenant_id: string;
  account_id: string;
}

export interface DeviceTokenItem {
  id: string;
  token: string;
  platform: Platform;
  device_id?: string;
  last_used_at?: ProtoTimestamp;
  created_at?: ProtoTimestamp;
}

export interface GetDeviceTokensResponse {
  tokens: DeviceTokenItem[];
}

// Quiet Hours Types
export interface GetQuietHoursRequest {
  tenant_id: string;
  account_id: string;
}

export interface GetQuietHoursResponse {
  enabled: boolean;
  start_time: string;
  end_time: string;
  timezone: string;
}

export interface UpdateQuietHoursRequest {
  tenant_id: string;
  account_id: string;
  enabled: boolean;
  start_time: string;
  end_time: string;
  timezone: string;
}

export interface UpdateQuietHoursResponse {
  success: boolean;
  message: string;
}

// Service Interface
export interface INotificationService {
  // Core Notifications
  sendNotification(request: SendNotificationRequest): Observable<SendNotificationResponse>;
  sendBulkNotification(
    request: SendBulkNotificationRequest,
  ): Observable<SendBulkNotificationResponse>;
  getNotifications(request: GetNotificationsRequest): Observable<GetNotificationsResponse>;
  markAsRead(request: MarkAsReadRequest): Observable<MarkAsReadResponse>;
  getNotificationStatus(
    request: GetNotificationStatusRequest,
  ): Observable<GetNotificationStatusResponse>;
  // Preferences
  getPreferences(request: GetPreferencesRequest): Observable<GetPreferencesResponse>;
  updatePreferences(request: UpdatePreferencesRequest): Observable<UpdatePreferencesResponse>;
  // Device Tokens
  registerDeviceToken(request: RegisterDeviceTokenRequest): Observable<RegisterDeviceTokenResponse>;
  unregisterDeviceToken(
    request: UnregisterDeviceTokenRequest,
  ): Observable<UnregisterDeviceTokenResponse>;
  getDeviceTokens(request: GetDeviceTokensRequest): Observable<GetDeviceTokensResponse>;
  // Quiet Hours
  getQuietHours(request: GetQuietHoursRequest): Observable<GetQuietHoursResponse>;
  updateQuietHours(request: UpdateQuietHoursRequest): Observable<UpdateQuietHoursResponse>;
}

/**
 * Notification Service gRPC Client
 *
 * Usage:
 * ```typescript
 * @Module({
 *   imports: [GrpcClientsModule.forRoot({ notification: true })],
 * })
 * export class AppModule {}
 *
 * @Injectable()
 * class AuthService {
 *   constructor(private readonly notificationClient: NotificationGrpcClient) {}
 *
 *   async notifyLoginAlert(accountId: string) {
 *     await this.notificationClient.sendNotification({
 *       tenant_id: 'default',
 *       account_id: accountId,
 *       type: NotificationType.NOTIFICATION_TYPE_LOGIN_ALERT,
 *       channels: [NotificationChannel.NOTIFICATION_CHANNEL_PUSH],
 *       title: 'New Login Detected',
 *       body: 'A new login was detected on your account.',
 *       locale: 'en',
 *       source_service: 'auth-service',
 *       priority: Priority.PRIORITY_HIGH,
 *     });
 *   }
 * }
 * ```
 */
@Injectable()
export class NotificationGrpcClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationGrpcClient.name);
  private notificationService!: INotificationService;
  private resilience!: GrpcResilience;
  private timeoutMs = DEFAULT_GRPC_TIMEOUT;

  constructor(
    @Inject(GRPC_SERVICES.NOTIFICATION)
    private readonly client: ClientGrpc,
  ) {}

  onModuleInit() {
    this.notificationService = this.client.getService<INotificationService>('NotificationService');
    this.resilience = createGrpcResilience('NotificationService', {
      timeoutMs: this.timeoutMs,
    });
    grpcHealthAggregator.register('NotificationService', this.resilience);
    this.logger.log('NotificationGrpcClient initialized with resilience patterns');
  }

  onModuleDestroy() {
    grpcHealthAggregator.unregister('NotificationService');
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
    this.logger.log('NotificationGrpcClient circuit breaker reset');
  }

  // ============================================================================
  // Core Notification Operations
  // ============================================================================

  /**
   * Send a single notification
   */
  async sendNotification(request: SendNotificationRequest): Promise<SendNotificationResponse> {
    return this.call('SendNotification', () => this.notificationService.sendNotification(request));
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotification(
    request: SendBulkNotificationRequest,
  ): Promise<SendBulkNotificationResponse> {
    return this.call('SendBulkNotification', () =>
      this.notificationService.sendBulkNotification(request),
    );
  }

  /**
   * Get notifications for an account
   */
  async getNotifications(request: GetNotificationsRequest): Promise<GetNotificationsResponse> {
    return this.call('GetNotifications', () => this.notificationService.getNotifications(request));
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(request: MarkAsReadRequest): Promise<MarkAsReadResponse> {
    return this.call('MarkAsRead', () => this.notificationService.markAsRead(request));
  }

  /**
   * Get notification status by ID
   */
  async getNotificationStatus(
    request: GetNotificationStatusRequest,
  ): Promise<GetNotificationStatusResponse> {
    return this.call('GetNotificationStatus', () =>
      this.notificationService.getNotificationStatus(request),
    );
  }

  // ============================================================================
  // Preferences Operations
  // ============================================================================

  /**
   * Get user notification preferences
   */
  async getPreferences(request: GetPreferencesRequest): Promise<GetPreferencesResponse> {
    return this.call('GetPreferences', () => this.notificationService.getPreferences(request));
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(request: UpdatePreferencesRequest): Promise<UpdatePreferencesResponse> {
    return this.call('UpdatePreferences', () =>
      this.notificationService.updatePreferences(request),
    );
  }

  // ============================================================================
  // Device Token Operations
  // ============================================================================

  /**
   * Register a device token for push notifications
   */
  async registerDeviceToken(
    request: RegisterDeviceTokenRequest,
  ): Promise<RegisterDeviceTokenResponse> {
    return this.call('RegisterDeviceToken', () =>
      this.notificationService.registerDeviceToken(request),
    );
  }

  /**
   * Unregister a device token
   */
  async unregisterDeviceToken(
    request: UnregisterDeviceTokenRequest,
  ): Promise<UnregisterDeviceTokenResponse> {
    return this.call('UnregisterDeviceToken', () =>
      this.notificationService.unregisterDeviceToken(request),
    );
  }

  /**
   * Get all device tokens for an account
   */
  async getDeviceTokens(request: GetDeviceTokensRequest): Promise<GetDeviceTokensResponse> {
    return this.call('GetDeviceTokens', () => this.notificationService.getDeviceTokens(request));
  }

  // ============================================================================
  // Quiet Hours Operations
  // ============================================================================

  /**
   * Get quiet hours settings for an account
   */
  async getQuietHours(request: GetQuietHoursRequest): Promise<GetQuietHoursResponse> {
    return this.call('GetQuietHours', () => this.notificationService.getQuietHours(request));
  }

  /**
   * Update quiet hours settings
   */
  async updateQuietHours(request: UpdateQuietHoursRequest): Promise<UpdateQuietHoursResponse> {
    return this.call('UpdateQuietHours', () => this.notificationService.updateQuietHours(request));
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
    this.logger.debug(`Calling NotificationService.${methodName}`);

    try {
      return await this.resilience.execute(fn, {
        timeoutMs: this.timeoutMs,
        ...options,
      });
    } catch (error) {
      this.logger.error(`NotificationService.${methodName} failed`, {
        error: error instanceof Error ? error.message : String(error),
        circuitState: this.resilience.getMetrics().state,
      });
      throw error;
    }
  }
}
