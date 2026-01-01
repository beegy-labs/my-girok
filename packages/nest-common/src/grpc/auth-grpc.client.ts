/**
 * Auth Service gRPC Client
 *
 * Provides a typed client for calling the AuthService via gRPC.
 *
 * @see packages/proto/auth/v1/auth.proto
 */

import { Injectable, OnModuleInit, Logger, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError, throwError } from 'rxjs';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { GRPC_SERVICES } from './grpc.options';
import { GrpcError, isGrpcError } from './identity-grpc.client';
import {
  IAuthService,
  CheckPermissionRequest,
  CheckPermissionResponse,
  CheckPermissionsRequest,
  CheckPermissionsResponse,
  GetOperatorPermissionsRequest,
  GetOperatorPermissionsResponse,
  GetRoleRequest,
  GetRoleResponse,
  GetRolesByOperatorRequest,
  GetRolesByOperatorResponse,
  GetOperatorRequest,
  GetOperatorResponse,
  ValidateOperatorRequest,
  ValidateOperatorResponse,
  CheckSanctionRequest,
  CheckSanctionResponse,
  GetActiveSanctionsRequest,
  GetActiveSanctionsResponse,
  SubjectType,
  SanctionType,
} from './grpc.types';

/**
 * Default timeout for gRPC calls (5 seconds)
 */
const DEFAULT_TIMEOUT = 5000;

/**
 * Auth Service gRPC Client
 *
 * Usage:
 * ```typescript
 * @Module({
 *   imports: [GrpcClientsModule.forRoot({ auth: true })],
 * })
 * export class AppModule {}
 *
 * @Injectable()
 * class SomeService {
 *   constructor(private readonly authClient: AuthGrpcClient) {}
 *
 *   async canAccessResource(operatorId: string, resource: string, action: string) {
 *     const response = await this.authClient.checkPermission({
 *       operator_id: operatorId,
 *       resource,
 *       action,
 *     });
 *     return response.allowed;
 *   }
 * }
 * ```
 */
@Injectable()
export class AuthGrpcClient implements OnModuleInit {
  private readonly logger = new Logger(AuthGrpcClient.name);
  private authService!: IAuthService;
  private timeoutMs = DEFAULT_TIMEOUT;

  constructor(
    @Inject(GRPC_SERVICES.AUTH)
    private readonly client: ClientGrpc,
  ) {}

  onModuleInit() {
    this.authService = this.client.getService<IAuthService>('AuthService');
    this.logger.log('AuthGrpcClient initialized');
  }

  /**
   * Set request timeout (in milliseconds)
   */
  setTimeout(ms: number): this {
    this.timeoutMs = ms;
    return this;
  }

  // ============================================================================
  // Permission Operations
  // ============================================================================

  /**
   * Check if operator has a specific permission
   */
  async checkPermission(request: CheckPermissionRequest): Promise<CheckPermissionResponse> {
    return this.call('CheckPermission', () => this.authService.checkPermission(request));
  }

  /**
   * Check multiple permissions at once
   */
  async checkPermissions(request: CheckPermissionsRequest): Promise<CheckPermissionsResponse> {
    return this.call('CheckPermissions', () => this.authService.checkPermissions(request));
  }

  /**
   * Get all permissions for an operator
   */
  async getOperatorPermissions(
    request: GetOperatorPermissionsRequest,
  ): Promise<GetOperatorPermissionsResponse> {
    return this.call('GetOperatorPermissions', () =>
      this.authService.getOperatorPermissions(request),
    );
  }

  // ============================================================================
  // Role Operations
  // ============================================================================

  /**
   * Get role by ID
   */
  async getRole(request: GetRoleRequest): Promise<GetRoleResponse> {
    return this.call('GetRole', () => this.authService.getRole(request));
  }

  /**
   * Get all roles assigned to an operator
   */
  async getRolesByOperator(
    request: GetRolesByOperatorRequest,
  ): Promise<GetRolesByOperatorResponse> {
    return this.call('GetRolesByOperator', () => this.authService.getRolesByOperator(request));
  }

  // ============================================================================
  // Operator Operations
  // ============================================================================

  /**
   * Get operator by ID
   */
  async getOperator(request: GetOperatorRequest): Promise<GetOperatorResponse> {
    return this.call('GetOperator', () => this.authService.getOperator(request));
  }

  /**
   * Validate operator exists and is active
   */
  async validateOperator(request: ValidateOperatorRequest): Promise<ValidateOperatorResponse> {
    return this.call('ValidateOperator', () => this.authService.validateOperator(request));
  }

  // ============================================================================
  // Sanction Operations
  // ============================================================================

  /**
   * Check if subject has any active sanctions
   */
  async checkSanction(request: CheckSanctionRequest): Promise<CheckSanctionResponse> {
    return this.call('CheckSanction', () => this.authService.checkSanction(request));
  }

  /**
   * Get all active sanctions for a subject
   */
  async getActiveSanctions(
    request: GetActiveSanctionsRequest,
  ): Promise<GetActiveSanctionsResponse> {
    return this.call('GetActiveSanctions', () => this.authService.getActiveSanctions(request));
  }

  // ============================================================================
  // Convenience Methods
  // ============================================================================

  /**
   * Check if a user is sanctioned
   */
  async isUserSanctioned(userId: string, sanctionType?: SanctionType): Promise<boolean> {
    const response = await this.checkSanction({
      subject_id: userId,
      subject_type: SubjectType.SUBJECT_TYPE_USER,
      sanction_type: sanctionType,
    });
    return response.is_sanctioned;
  }

  /**
   * Check if an operator has access to a resource
   */
  async hasPermission(operatorId: string, resource: string, action: string): Promise<boolean> {
    const response = await this.checkPermission({
      operator_id: operatorId,
      resource,
      action,
    });
    return response.allowed;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Execute a gRPC call with timeout and error handling
   */
  private async call<T>(methodName: string, fn: () => import('rxjs').Observable<T>): Promise<T> {
    this.logger.debug(`Calling AuthService.${methodName}`);

    try {
      return await firstValueFrom(
        fn().pipe(
          timeout(this.timeoutMs),
          catchError((error) => {
            this.logger.error(`AuthService.${methodName} error: ${error.message}`);
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
      if (error.name === 'TimeoutError') {
        return {
          code: GrpcStatus.DEADLINE_EXCEEDED,
          message: 'Request timeout',
          details: error.message,
        };
      }

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
