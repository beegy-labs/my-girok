import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { NotificationService } from './notification.service';
import { PreferencesService } from '../preferences/preferences.service';
import { DeviceTokenService } from '../device-token/device-token.service';
import { QuietHoursService } from '../quiet-hours/quiet-hours.service';
import {
  // Core Notification
  SendNotificationRequest,
  SendNotificationResponse,
  SendBulkNotificationRequest,
  SendBulkNotificationResponse,
  GetNotificationsRequest,
  GetNotificationsResponse,
  MarkAsReadRequest,
  MarkAsReadResponse,
  GetNotificationStatusRequest,
  GetNotificationStatusResponse,
  // Preferences
  GetPreferencesRequest,
  GetPreferencesResponse,
  UpdatePreferencesRequest,
  UpdatePreferencesResponse,
  // Device Token
  RegisterDeviceTokenRequest,
  RegisterDeviceTokenResponse,
  UnregisterDeviceTokenRequest,
  UnregisterDeviceTokenResponse,
  GetDeviceTokensRequest,
  GetDeviceTokensResponse,
  // Quiet Hours
  GetQuietHoursRequest,
  GetQuietHoursResponse,
  UpdateQuietHoursRequest,
  UpdateQuietHoursResponse,
} from './notification.interface';

@Controller()
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly preferencesService: PreferencesService,
    private readonly deviceTokenService: DeviceTokenService,
    private readonly quietHoursService: QuietHoursService,
  ) {}

  // ============================================================
  // Core Notification APIs
  // ============================================================

  @GrpcMethod('NotificationService', 'SendNotification')
  async sendNotification(request: SendNotificationRequest): Promise<SendNotificationResponse> {
    this.logger.log(
      `SendNotification: accountId=${request.accountId}, type=${request.type}, channels=${request.channels?.length || 0}`,
    );
    return this.notificationService.sendNotification(request);
  }

  @GrpcMethod('NotificationService', 'SendBulkNotification')
  async sendBulkNotification(
    request: SendBulkNotificationRequest,
  ): Promise<SendBulkNotificationResponse> {
    this.logger.log(
      `SendBulkNotification: tenantId=${request.tenantId}, count=${request.notifications?.length || 0}`,
    );
    return this.notificationService.sendBulkNotification(request);
  }

  @GrpcMethod('NotificationService', 'GetNotifications')
  async getNotifications(request: GetNotificationsRequest): Promise<GetNotificationsResponse> {
    this.logger.log(
      `GetNotifications: accountId=${request.accountId}, page=${request.page}, pageSize=${request.pageSize}`,
    );
    return this.notificationService.getNotifications(request);
  }

  @GrpcMethod('NotificationService', 'MarkAsRead')
  async markAsRead(request: MarkAsReadRequest): Promise<MarkAsReadResponse> {
    this.logger.log(
      `MarkAsRead: accountId=${request.accountId}, ids=${request.notificationIds?.length || 0}`,
    );
    return this.notificationService.markAsRead(request);
  }

  @GrpcMethod('NotificationService', 'GetNotificationStatus')
  async getNotificationStatus(
    request: GetNotificationStatusRequest,
  ): Promise<GetNotificationStatusResponse> {
    this.logger.log(`GetNotificationStatus: notificationId=${request.notificationId}`);
    return this.notificationService.getNotificationStatus(request);
  }

  // ============================================================
  // User Preferences APIs
  // ============================================================

  @GrpcMethod('NotificationService', 'GetPreferences')
  async getPreferences(request: GetPreferencesRequest): Promise<GetPreferencesResponse> {
    this.logger.log(`GetPreferences: accountId=${request.accountId}`);
    return this.preferencesService.getPreferences(request);
  }

  @GrpcMethod('NotificationService', 'UpdatePreferences')
  async updatePreferences(request: UpdatePreferencesRequest): Promise<UpdatePreferencesResponse> {
    this.logger.log(
      `UpdatePreferences: accountId=${request.accountId}, channelPrefs=${request.channelPreferences?.length || 0}, typePrefs=${request.typePreferences?.length || 0}`,
    );
    return this.preferencesService.updatePreferences(request);
  }

  // ============================================================
  // Device Token APIs
  // ============================================================

  @GrpcMethod('NotificationService', 'RegisterDeviceToken')
  async registerDeviceToken(
    request: RegisterDeviceTokenRequest,
  ): Promise<RegisterDeviceTokenResponse> {
    this.logger.log(
      `RegisterDeviceToken: accountId=${request.accountId}, platform=${request.platform}, deviceId=${request.deviceId}`,
    );
    return this.deviceTokenService.registerDeviceToken(request);
  }

  @GrpcMethod('NotificationService', 'UnregisterDeviceToken')
  async unregisterDeviceToken(
    request: UnregisterDeviceTokenRequest,
  ): Promise<UnregisterDeviceTokenResponse> {
    this.logger.log(`UnregisterDeviceToken: accountId=${request.accountId}`);
    return this.deviceTokenService.unregisterDeviceToken(request);
  }

  @GrpcMethod('NotificationService', 'GetDeviceTokens')
  async getDeviceTokens(request: GetDeviceTokensRequest): Promise<GetDeviceTokensResponse> {
    this.logger.log(`GetDeviceTokens: accountId=${request.accountId}`);
    return this.deviceTokenService.getDeviceTokens(request);
  }

  // ============================================================
  // Quiet Hours / DND APIs
  // ============================================================

  @GrpcMethod('NotificationService', 'GetQuietHours')
  async getQuietHours(request: GetQuietHoursRequest): Promise<GetQuietHoursResponse> {
    this.logger.log(`GetQuietHours: accountId=${request.accountId}`);
    return this.quietHoursService.getQuietHours(request);
  }

  @GrpcMethod('NotificationService', 'UpdateQuietHours')
  async updateQuietHours(request: UpdateQuietHoursRequest): Promise<UpdateQuietHoursResponse> {
    this.logger.log(
      `UpdateQuietHours: accountId=${request.accountId}, enabled=${request.enabled}, ${request.startTime}-${request.endTime} (${request.timezone})`,
    );
    return this.quietHoursService.updateQuietHours(request);
  }
}
