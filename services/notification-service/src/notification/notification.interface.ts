// gRPC request/response interfaces for NotificationService
// Matches notification.proto definitions

// ============================================================
// Enums
// ============================================================

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
  PRIORITY_URGENT = 4, // Bypasses Quiet Hours
}

export enum Platform {
  PLATFORM_UNSPECIFIED = 0,
  PLATFORM_IOS = 1,
  PLATFORM_ANDROID = 2,
  PLATFORM_WEB = 3,
}

// ============================================================
// Core Notification Messages
// ============================================================

export interface SendNotificationRequest {
  tenantId: string;
  accountId: string;
  type: NotificationType;
  channels: NotificationChannel[];
  title: string;
  body: string;
  locale: string;
  data: Record<string, string>;
  sourceService: string;
  priority: Priority;
  idempotencyKey?: string;
  expiresAt?: { seconds: number; nanos: number };
}

export interface SendNotificationResponse {
  success: boolean;
  notificationId: string;
  message: string;
}

export interface BulkNotificationItem {
  accountId: string;
  type: NotificationType;
  channels: NotificationChannel[];
  title: string;
  body: string;
  locale: string;
  data: Record<string, string>;
  priority: Priority;
  idempotencyKey?: string;
}

export interface SendBulkNotificationRequest {
  tenantId: string;
  notifications: BulkNotificationItem[];
  sourceService: string;
}

export interface BulkNotificationResult {
  accountId: string;
  success: boolean;
  notificationId: string;
  error?: string;
}

export interface SendBulkNotificationResponse {
  success: boolean;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  results: BulkNotificationResult[];
}

export interface GetNotificationsRequest {
  tenantId: string;
  accountId: string;
  channel?: NotificationChannel;
  unreadOnly?: boolean;
  page: number;
  pageSize: number;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  body: string;
  data: Record<string, string>;
  status: NotificationStatus;
  sourceService: string;
  priority: Priority;
  readAt?: { seconds: number; nanos: number };
  createdAt: { seconds: number; nanos: number };
}

export interface GetNotificationsResponse {
  notifications: NotificationItem[];
  totalCount: number;
  unreadCount: number;
  page: number;
  pageSize: number;
}

export interface MarkAsReadRequest {
  tenantId: string;
  accountId: string;
  notificationIds: string[];
}

export interface MarkAsReadResponse {
  success: boolean;
  updatedCount: number;
}

export interface GetNotificationStatusRequest {
  notificationId: string;
}

export interface GetNotificationStatusResponse {
  notificationId: string;
  status: NotificationStatus;
  channel: string;
  externalId?: string;
  sentAt?: { seconds: number; nanos: number };
  deliveredAt?: { seconds: number; nanos: number };
  error?: string;
  retryCount: number;
}

// ============================================================
// Preferences Messages
// ============================================================

export interface GetPreferencesRequest {
  tenantId: string;
  accountId: string;
}

export interface ChannelPreference {
  channel: NotificationChannel;
  enabled: boolean;
}

export interface TypePreference {
  type: NotificationType;
  enabledChannels: NotificationChannel[];
}

export interface GetPreferencesResponse {
  channelPreferences: ChannelPreference[];
  typePreferences: TypePreference[];
}

export interface UpdatePreferencesRequest {
  tenantId: string;
  accountId: string;
  channelPreferences: ChannelPreference[];
  typePreferences: TypePreference[];
}

export interface UpdatePreferencesResponse {
  success: boolean;
  message: string;
}

// ============================================================
// Device Token Messages
// ============================================================

export interface RegisterDeviceTokenRequest {
  tenantId: string;
  accountId: string;
  token: string;
  platform: Platform;
  deviceId: string;
  deviceInfo: Record<string, string>;
}

export interface RegisterDeviceTokenResponse {
  success: boolean;
  deviceTokenId: string;
  message: string;
}

export interface UnregisterDeviceTokenRequest {
  tenantId: string;
  accountId: string;
  token: string;
}

export interface UnregisterDeviceTokenResponse {
  success: boolean;
  message: string;
}

export interface GetDeviceTokensRequest {
  tenantId: string;
  accountId: string;
}

export interface DeviceTokenItem {
  id: string;
  token: string;
  platform: Platform;
  deviceId: string;
  lastUsedAt?: { seconds: number; nanos: number };
  createdAt: { seconds: number; nanos: number };
}

export interface GetDeviceTokensResponse {
  tokens: DeviceTokenItem[];
}

// ============================================================
// Quiet Hours Messages
// ============================================================

export interface GetQuietHoursRequest {
  tenantId: string;
  accountId: string;
}

export interface GetQuietHoursResponse {
  enabled: boolean;
  startTime: string; // "22:00"
  endTime: string; // "08:00"
  timezone: string; // "Asia/Seoul"
}

export interface UpdateQuietHoursRequest {
  tenantId: string;
  accountId: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
  timezone: string;
}

export interface UpdateQuietHoursResponse {
  success: boolean;
  message: string;
}

// ============================================================
// Internal Types for Channel Services
// ============================================================

export interface ChannelDeliveryRequest {
  notificationId: string;
  tenantId: string;
  accountId: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  body: string;
  data: Record<string, string>;
  locale: string;
  priority: Priority;
}

export interface ChannelDeliveryResult {
  success: boolean;
  externalId?: string;
  error?: string;
}
