/**
 * Identity Service gRPC Client
 *
 * Provides a typed client for calling the IdentityService via gRPC.
 *
 * @see packages/proto/identity/v1/identity.proto
 */

import { Injectable, OnModuleInit, Logger, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError, throwError } from 'rxjs';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { GRPC_SERVICES } from './grpc.options';
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
 * gRPC error structure
 */
export interface GrpcError {
  code: GrpcStatus;
  message: string;
  details?: string;
}

/**
 * Check if error is a gRPC error
 */
export function isGrpcError(error: unknown): error is GrpcError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as GrpcError).code === 'number'
  );
}

/**
 * Default timeout for gRPC calls (5 seconds)
 */
const DEFAULT_TIMEOUT = 5000;

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
export class IdentityGrpcClient implements OnModuleInit {
  private readonly logger = new Logger(IdentityGrpcClient.name);
  private identityService!: IIdentityService;
  private timeoutMs = DEFAULT_TIMEOUT;

  constructor(
    @Inject(GRPC_SERVICES.IDENTITY)
    private readonly client: ClientGrpc,
  ) {}

  onModuleInit() {
    this.identityService = this.client.getService<IIdentityService>('IdentityService');
    this.logger.log('IdentityGrpcClient initialized');
  }

  /**
   * Set request timeout (in milliseconds)
   */
  setTimeout(ms: number): this {
    this.timeoutMs = ms;
    return this;
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
   * Execute a gRPC call with timeout and error handling
   */
  private async call<T>(methodName: string, fn: () => import('rxjs').Observable<T>): Promise<T> {
    this.logger.debug(`Calling IdentityService.${methodName}`);

    try {
      return await firstValueFrom(
        fn().pipe(
          timeout(this.timeoutMs),
          catchError((error) => {
            this.logger.error(`IdentityService.${methodName} error: ${error.message}`);
            return throwError(() => this.normalizeError(error));
          }),
        ),
      );
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  /**
   * Normalize error to consistent format
   */
  private normalizeError(error: unknown): GrpcError {
    if (isGrpcError(error)) {
      return error;
    }

    if (error instanceof Error) {
      // Check for timeout
      if (error.name === 'TimeoutError') {
        return {
          code: GrpcStatus.DEADLINE_EXCEEDED,
          message: 'Request timeout',
          details: error.message,
        };
      }

      // Check for connection errors
      if (error.message.includes('UNAVAILABLE') || error.message.includes('ECONNREFUSED')) {
        return {
          code: GrpcStatus.UNAVAILABLE,
          message: 'Service unavailable',
          details: error.message,
        };
      }

      return {
        code: GrpcStatus.UNKNOWN,
        message: error.message,
      };
    }

    return {
      code: GrpcStatus.UNKNOWN,
      message: 'Unknown error occurred',
    };
  }
}
