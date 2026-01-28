/**
 * gRPC Clients for Inter-Service Communication
 *
 * This module provides typed gRPC clients for calling other services:
 * - IdentityGrpcClient - Account, Session, Device, Profile operations
 * - AuthGrpcClient - Permission, Role, Operator, Sanction operations
 * - LegalGrpcClient - Consent, Document, Law Registry, DSR operations
 * - AuditGrpcClient - Auth events, Security events logging
 * - MailGrpcClient - Email sending, inbox management
 * - NotificationGrpcClient - Push, SMS, in-app notifications
 *
 * @example
 * ```typescript
 * // Import the module
 * import { GrpcClientsModule, IdentityGrpcClient } from '@my-girok/nest-common';
 *
 * @Module({
 *   imports: [GrpcClientsModule.forRoot()],
 * })
 * export class AppModule {}
 *
 * @Injectable()
 * class UserService {
 *   constructor(private readonly identityClient: IdentityGrpcClient) {}
 *
 *   async getUser(id: string) {
 *     const response = await this.identityClient.getAccount({ id });
 *     return response.account;
 *   }
 * }
 * ```
 */

// Module
export {
  GrpcClientsModule,
  GrpcClientsOptions,
  GrpcClientsAsyncOptions,
  IdentityGrpcClientModule,
  AuthGrpcClientModule,
  LegalGrpcClientModule,
  AuditGrpcClientModule,
  MailGrpcClientModule,
  NotificationGrpcClientModule,
} from './grpc-clients.module';

// Clients
export { IdentityGrpcClient } from './identity-grpc.client';
export { AuthGrpcClient, AUTH_GRPC_CACHE_CONFIG } from './auth-grpc.client';
export { LegalGrpcClient } from './legal-grpc.client';
export { AuditGrpcClient } from './audit-grpc.client';
export { MailGrpcClient } from './mail-grpc.client';
export { NotificationGrpcClient } from './notification-grpc.client';

// Audit Client Types
export {
  AuthEventType,
  AccountType as AuditAccountType,
  AuthEventResult,
  SecurityEventType,
  SecurityEventSeverity,
  LogAuthEventRequest,
  LogAuthEventResponse,
  LogSecurityEventRequest,
  LogSecurityEventResponse,
} from './audit-grpc.client';

// Mail Client Types
export {
  EmailTemplate,
  EmailStatus,
  SendEmailRequest,
  SendEmailResponse,
  SendBulkEmailRequest,
  SendBulkEmailResponse,
  GetEmailStatusRequest,
  GetEmailStatusResponse,
  GetInboxRequest,
  GetInboxResponse,
} from './mail-grpc.client';

// Notification Client Types
export {
  NotificationChannel,
  NotificationType,
  NotificationStatus,
  Priority,
  Platform,
  SendNotificationRequest,
  SendNotificationResponse,
  GetNotificationsRequest,
  GetNotificationsResponse,
  RegisterDeviceTokenRequest,
  RegisterDeviceTokenResponse,
  GetQuietHoursRequest,
  GetQuietHoursResponse,
} from './notification-grpc.client';

// Timestamp Utilities
export {
  toProtoTimestamp,
  fromProtoTimestamp,
  toProtoTimestampNullable,
  fromProtoTimestampNullable,
  nowAsProtoTimestamp,
  compareProtoTimestamps,
  isProtoTimestampPast,
  isProtoTimestampFuture,
} from './grpc-timestamp.util';

// Enum Mapping Utilities
export {
  // Generic mapping helpers
  createEnumMapper,
  safeFromProto,
  safeToProto,
  mapArrayFromProto,
  mapArrayToProto,
  PROTO_ENUM_UNSPECIFIED,
  isProtoEnumUnspecified,
  dbToProtoWithFallback,
  protoToDbWithFallback,
  // Re-exported Proto mappings (also available from grpc.types)
  // Identity
  AccountStatusProto,
  AccountModeProto,
  protoToAccountStatus,
  protoToAccountMode,
  accountStatusToProto,
  accountModeToProto,
  // Auth
  RoleScopeProto,
  protoToRoleScope,
  roleScopeToProto,
  OperatorStatusProto,
  protoToOperatorStatus,
  operatorStatusToProto,
  isActiveToOperatorStatus,
  operatorStatusToIsActive,
  AuthProviderProto,
  protoToAuthProvider,
  authProviderToProto,
  SanctionSeverityProto,
  protoToSanctionSeverity,
  sanctionSeverityToProto,
  // Legal
  ConsentTypeProto,
  ConsentStatusProto,
  DocumentTypeProto,
  DsrTypeProto,
  DsrStatusProto,
  protoToConsentType,
  protoToConsentStatus,
  protoToDocumentType,
  protoToDsrType,
  protoToDsrStatus,
  consentTypeToProto,
  consentStatusToProto,
  documentTypeToProto,
  dsrTypeToProto,
  dsrStatusToProto,
  // Sanction
  SubjectTypeProto,
  SanctionTypeProto,
  SanctionStatusProto,
  protoToSubjectType,
  protoToSanctionType,
  protoToSanctionStatus,
  subjectTypeToProto,
  sanctionTypeToProto,
  sanctionStatusToProto,
} from './grpc-enum.util';
export type { EnumMapper } from './grpc-enum.util';

// Error Utilities
export {
  GrpcError,
  isGrpcError,
  normalizeGrpcError,
  // Server-side error handling
  handleGrpcError,
  createGrpcError,
  GrpcErrors,
  // HTTP <-> gRPC status mapping
  httpStatusToGrpcStatus,
  grpcStatusToHttpStatus,
  // Error checking utilities
  isGrpcStatusCode,
  isRetryableGrpcError,
} from './grpc-error.util';

// Validation Utilities
export {
  GrpcValidationInterceptor,
  GrpcValidationPipe,
  GrpcValidationOptions,
  ValidationErrorDetail,
  createTypedValidationInterceptor,
  ValidateGrpcRequest,
  GRPC_VALIDATION_RULES,
  isValidUuid,
  isValidEmail,
  isValidCountryCode,
} from './grpc-validation.interceptor';

// Rate Limiting
export {
  GrpcRateLimitGuard,
  GrpcRateLimit,
  RateLimitConfig,
  RateLimitStore,
  InMemoryRateLimitStore,
  RateLimitModuleOptions as GrpcRateLimitModuleOptions, // Aliased to avoid conflict with rate-limit module
  RATE_LIMIT_STORE,
  GRPC_RATE_LIMIT_KEY,
  DEFAULT_RATE_LIMIT,
  RATE_LIMIT_PRESETS,
  createRateLimitProviders,
} from './grpc-rate-limit.guard';

// Caching
export {
  GrpcResponseCache,
  GrpcCacheConfig,
  CacheStats,
  DEFAULT_CACHE_CONFIG,
  PermissionCache,
  PermissionCacheEntry,
  PermissionCacheConfig,
  CacheDecoratorOptions,
  withCache,
} from './grpc-cache.util';

// Resilience Utilities (Retry, Circuit Breaker)
export {
  // Types
  RetryConfig,
  CircuitBreakerConfig as GrpcCircuitBreakerConfig, // Aliased to avoid conflict with resilience module
  ResilienceConfig,
  ResilientCallOptions,
  CircuitState as GrpcCircuitState, // Aliased to avoid conflict with resilience module
  CircuitBreakerMetrics as GrpcCircuitBreakerMetrics, // Aliased for consistency
  GrpcHealthStatus,
  GrpcResilience,
  // Defaults
  DEFAULT_RETRY_CONFIG,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  DEFAULT_RESILIENCE_CONFIG,
  // Functions
  createGrpcResilience,
  calculateBackoffDelay,
  isRetryableError,
  retryWithBackoff,
  // Classes
  CircuitBreaker as GrpcCircuitBreaker, // Aliased to avoid conflict with resilience module
  GrpcHealthAggregator,
  // Global instances
  grpcHealthAggregator,
} from './grpc-resilience.util';

// Options & Configuration
export {
  DEFAULT_GRPC_TIMEOUT,
  GRPC_PORTS,
  GRPC_SERVICES,
  GRPC_PACKAGES,
  GrpcClientConfig,
  GrpcEnvironmentConfig,
  createIdentityGrpcOptions,
  createAuthGrpcOptions,
  createLegalGrpcOptions,
  createAuditGrpcOptions,
  createMailGrpcOptions,
  createNotificationGrpcOptions,
  loadGrpcConfigFromEnv,
  // Channel Options
  DEFAULT_CHANNEL_OPTIONS,
  K8S_CHANNEL_OPTIONS,
  DEV_CHANNEL_OPTIONS,
  getEnvironment,
  getChannelOptionsForEnv,
} from './grpc.options';

// Types (re-export all types for consumer convenience)
export * from './grpc.types';
