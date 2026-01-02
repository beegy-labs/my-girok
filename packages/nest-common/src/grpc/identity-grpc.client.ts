/**
 * Identity Service gRPC Client
 *
 * Provides a typed client for calling the IdentityService via gRPC.
 * Includes enterprise-grade resilience patterns:
 * - Exponential backoff with jitter
 * - Circuit breaker
 * - Request timeout
 *
 * @see packages/proto/identity/v1/identity.proto
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { GRPC_SERVICES, DEFAULT_GRPC_TIMEOUT } from './grpc.options';
import {
  createGrpcResilience,
  GrpcResilience,
  ResilientCallOptions,
  grpcHealthAggregator,
  CircuitBreakerMetrics,
} from './grpc-resilience.util';
import {
  IIdentityService,
  GetAccountRequest,
  GetAccountResponse,
  GetAccountByEmailRequest,
  GetAccountByEmailResponse,
  GetAccountByUsernameRequest,
  GetAccountByUsernameResponse,
  ValidateAccountRequest,
  ValidateAccountResponse,
  ValidateSessionRequest,
  ValidateSessionResponse,
  RevokeSessionRequest,
  RevokeSessionResponse,
  RevokeAllSessionsRequest,
  RevokeAllSessionsResponse,
  GetAccountDevicesRequest,
  GetAccountDevicesResponse,
  TrustDeviceRequest,
  TrustDeviceResponse,
  RevokeDeviceRequest,
  RevokeDeviceResponse,
  GetProfileRequest,
  GetProfileResponse,
  CreateAccountRequest,
  CreateAccountResponse,
  UpdateAccountRequest,
  UpdateAccountResponse,
  DeleteAccountRequest,
  DeleteAccountResponse,
  ValidatePasswordRequest,
  ValidatePasswordResponse,
  CreateSessionRequest,
  CreateSessionResponse,
} from './grpc.types';

/**
 * Identity Service gRPC Client
 *
 * Usage:
 * ```typescript
 * @Module({
 *   imports: [GrpcClientsModule.forRoot({ identity: true })],
 * })
 * export class AppModule {}
 *
 * @Injectable()
 * class SomeService {
 *   constructor(private readonly identityClient: IdentityGrpcClient) {}
 *
 *   async getUser(id: string) {
 *     const response = await this.identityClient.getAccount({ id });
 *     return response.account;
 *   }
 * }
 * ```
 */
@Injectable()
export class IdentityGrpcClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IdentityGrpcClient.name);
  private identityService!: IIdentityService;
  private resilience!: GrpcResilience;
  private timeoutMs = DEFAULT_GRPC_TIMEOUT;

  constructor(
    @Inject(GRPC_SERVICES.IDENTITY)
    private readonly client: ClientGrpc,
  ) {}

  onModuleInit() {
    this.identityService = this.client.getService<IIdentityService>('IdentityService');
    this.resilience = createGrpcResilience('IdentityService', {
      timeoutMs: this.timeoutMs,
    });
    grpcHealthAggregator.register('IdentityService', this.resilience);
    this.logger.log('IdentityGrpcClient initialized with resilience patterns');
  }

  onModuleDestroy() {
    grpcHealthAggregator.unregister('IdentityService');
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
    this.logger.log('IdentityGrpcClient circuit breaker reset');
  }

  // ============================================================================
  // Account Operations
  // ============================================================================

  /**
   * Get account by ID
   */
  async getAccount(request: GetAccountRequest): Promise<GetAccountResponse> {
    return this.call('GetAccount', () => this.identityService.getAccount(request));
  }

  /**
   * Validate account exists and check status
   */
  async validateAccount(request: ValidateAccountRequest): Promise<ValidateAccountResponse> {
    return this.call('ValidateAccount', () => this.identityService.validateAccount(request));
  }

  /**
   * Get account by email address
   */
  async getAccountByEmail(request: GetAccountByEmailRequest): Promise<GetAccountByEmailResponse> {
    return this.call('GetAccountByEmail', () => this.identityService.getAccountByEmail(request));
  }

  /**
   * Get account by username
   */
  async getAccountByUsername(
    request: GetAccountByUsernameRequest,
  ): Promise<GetAccountByUsernameResponse> {
    return this.call('GetAccountByUsername', () =>
      this.identityService.getAccountByUsername(request),
    );
  }

  /**
   * Create a new account
   */
  async createAccount(request: CreateAccountRequest): Promise<CreateAccountResponse> {
    return this.call('CreateAccount', () => this.identityService.createAccount(request));
  }

  /**
   * Update an existing account
   */
  async updateAccount(request: UpdateAccountRequest): Promise<UpdateAccountResponse> {
    return this.call('UpdateAccount', () => this.identityService.updateAccount(request));
  }

  /**
   * Delete an account (soft delete)
   */
  async deleteAccount(request: DeleteAccountRequest): Promise<DeleteAccountResponse> {
    return this.call('DeleteAccount', () => this.identityService.deleteAccount(request));
  }

  /**
   * Validate password for authentication
   */
  async validatePassword(request: ValidatePasswordRequest): Promise<ValidatePasswordResponse> {
    return this.call('ValidatePassword', () => this.identityService.validatePassword(request));
  }

  // ============================================================================
  // Session Operations
  // ============================================================================

  /**
   * Create a new session
   */
  async createSession(request: CreateSessionRequest): Promise<CreateSessionResponse> {
    return this.call('CreateSession', () => this.identityService.createSession(request));
  }

  /**
   * Validate session by token hash
   */
  async validateSession(request: ValidateSessionRequest): Promise<ValidateSessionResponse> {
    return this.call('ValidateSession', () => this.identityService.validateSession(request));
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(request: RevokeSessionRequest): Promise<RevokeSessionResponse> {
    return this.call('RevokeSession', () => this.identityService.revokeSession(request));
  }

  /**
   * Revoke all sessions for an account
   */
  async revokeAllSessions(request: RevokeAllSessionsRequest): Promise<RevokeAllSessionsResponse> {
    return this.call('RevokeAllSessions', () => this.identityService.revokeAllSessions(request));
  }

  // ============================================================================
  // Device Operations
  // ============================================================================

  /**
   * Get all devices for an account
   */
  async getAccountDevices(request: GetAccountDevicesRequest): Promise<GetAccountDevicesResponse> {
    return this.call('GetAccountDevices', () => this.identityService.getAccountDevices(request));
  }

  /**
   * Trust a device
   */
  async trustDevice(request: TrustDeviceRequest): Promise<TrustDeviceResponse> {
    return this.call('TrustDevice', () => this.identityService.trustDevice(request));
  }

  /**
   * Revoke/remove a device
   */
  async revokeDevice(request: RevokeDeviceRequest): Promise<RevokeDeviceResponse> {
    return this.call('RevokeDevice', () => this.identityService.revokeDevice(request));
  }

  // ============================================================================
  // Profile Operations
  // ============================================================================

  /**
   * Get profile by account ID
   */
  async getProfile(request: GetProfileRequest): Promise<GetProfileResponse> {
    return this.call('GetProfile', () => this.identityService.getProfile(request));
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Execute a gRPC call with resilience patterns (retry, circuit breaker, timeout)
   */
  private async call<T>(
    methodName: string,
    fn: () => import('rxjs').Observable<T>,
    options?: ResilientCallOptions,
  ): Promise<T> {
    this.logger.debug(`Calling IdentityService.${methodName}`);

    try {
      return await this.resilience.execute(fn, {
        timeoutMs: this.timeoutMs,
        ...options,
      });
    } catch (error) {
      this.logger.error(`IdentityService.${methodName} failed`, {
        error: error instanceof Error ? error.message : String(error),
        circuitState: this.resilience.getMetrics().state,
      });
      throw error;
    }
  }
}
