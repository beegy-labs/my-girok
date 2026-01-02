/**
 * Auth Service gRPC Client
 *
 * Provides a typed client for calling the AuthService via gRPC.
 * Includes enterprise-grade resilience patterns:
 * - Exponential backoff with jitter
 * - Circuit breaker
 * - Request timeout
 *
 * @see packages/proto/auth/v1/auth.proto
 */

import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { GRPC_SERVICES, DEFAULT_GRPC_TIMEOUT } from './grpc.options';
import {
  createGrpcResilience,
  GrpcResilience,
  ResilientCallOptions,
  grpcHealthAggregator,
  CircuitBreakerMetrics,
} from './grpc-resilience.util';
import { PermissionCache, PermissionCacheConfig, CacheStats } from './grpc-cache.util';
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
/**
 * Injection token for permission cache configuration
 */
export const AUTH_GRPC_CACHE_CONFIG = 'AUTH_GRPC_CACHE_CONFIG';

@Injectable()
export class AuthGrpcClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuthGrpcClient.name);
  private authService!: IAuthService;
  private resilience!: GrpcResilience;
  private permissionCache!: PermissionCache;
  private timeoutMs = DEFAULT_GRPC_TIMEOUT;
  private cacheEnabled = true;

  constructor(
    @Inject(GRPC_SERVICES.AUTH)
    private readonly client: ClientGrpc,
    @Optional()
    @Inject(AUTH_GRPC_CACHE_CONFIG)
    private readonly cacheConfig?: Partial<PermissionCacheConfig>,
  ) {}

  onModuleInit() {
    this.authService = this.client.getService<IAuthService>('AuthService');
    this.resilience = createGrpcResilience('AuthService', {
      timeoutMs: this.timeoutMs,
    });
    this.permissionCache = new PermissionCache(this.cacheConfig);
    grpcHealthAggregator.register('AuthService', this.resilience);
    this.logger.log('AuthGrpcClient initialized with resilience patterns and permission caching');
  }

  onModuleDestroy() {
    grpcHealthAggregator.unregister('AuthService');
    this.permissionCache.clear();
  }

  /**
   * Set request timeout (in milliseconds)
   */
  setTimeout(ms: number): this {
    this.timeoutMs = ms;
    return this;
  }

  /**
   * Enable or disable permission caching
   */
  setCacheEnabled(enabled: boolean): this {
    this.cacheEnabled = enabled;
    return this;
  }

  /**
   * Get circuit breaker metrics for monitoring
   */
  getCircuitBreakerMetrics(): CircuitBreakerMetrics {
    return this.resilience.getMetrics();
  }

  /**
   * Get permission cache statistics
   */
  getCacheStats(): CacheStats & { permissionChecks: number } {
    return this.permissionCache.getStats();
  }

  /**
   * Invalidate cached permissions for an operator
   */
  invalidateOperatorCache(operatorId: string): void {
    this.permissionCache.invalidateOperator(operatorId);
  }

  /**
   * Invalidate cached permissions for a role (affects all operators with that role)
   */
  invalidateRoleCache(roleId: string): void {
    this.permissionCache.invalidateRole(roleId);
  }

  /**
   * Clear all permission caches
   */
  clearCache(): void {
    this.permissionCache.clear();
  }

  /**
   * Reset circuit breaker (use for manual recovery)
   */
  resetCircuitBreaker(): void {
    this.resilience.reset();
    this.logger.log('AuthGrpcClient circuit breaker reset');
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
   * Uses cached permissions when available
   */
  async hasPermission(operatorId: string, resource: string, action: string): Promise<boolean> {
    // Check cache first if enabled
    if (this.cacheEnabled) {
      const cachedResult = this.permissionCache.hasPermission(operatorId, resource, action);
      if (cachedResult !== undefined) {
        this.logger.debug(
          `Permission check (cached): ${operatorId} ${resource}:${action} = ${cachedResult}`,
        );
        return cachedResult;
      }
    }

    // Cache miss - fetch from service
    const response = await this.checkPermission({
      operator_id: operatorId,
      resource,
      action,
    });

    return response.allowed;
  }

  /**
   * Preload permissions for an operator into cache
   * Call this after login to warm the cache
   */
  async preloadOperatorPermissions(operatorId: string): Promise<void> {
    if (!this.cacheEnabled) {
      return;
    }

    try {
      const response = await this.getOperatorPermissions({
        operator_id: operatorId,
        include_role_permissions: true,
      });

      const permissions = [
        ...response.permissions,
        ...response.direct_permissions,
        ...response.role_permissions,
      ].map((p) => `${p.resource}:${p.action}`);

      this.permissionCache.setOperatorPermissions({
        operatorId,
        permissions: [...new Set(permissions)], // Deduplicate
        updatedAt: Date.now(),
      });

      this.logger.debug(`Preloaded ${permissions.length} permissions for operator: ${operatorId}`);
    } catch (error) {
      this.logger.warn(`Failed to preload permissions for operator ${operatorId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
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
    this.logger.debug(`Calling AuthService.${methodName}`);

    try {
      return await this.resilience.execute(fn, {
        timeoutMs: this.timeoutMs,
        ...options,
      });
    } catch (error) {
      this.logger.error(`AuthService.${methodName} failed`, {
        error: error instanceof Error ? error.message : String(error),
        circuitState: this.resilience.getMetrics().state,
      });
      throw error;
    }
  }
}
