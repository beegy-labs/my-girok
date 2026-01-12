/**
 * AuthzCheck Guard
 *
 * NestJS guard for Zanzibar-style permission checking.
 * Uses the authorization-service via gRPC to verify permissions.
 *
 * Usage:
 * @AuthzCheck({
 *   relation: 'can_view',
 *   objectType: 'session_recording',
 *   objectIdFrom: 'query',
 *   objectIdKey: 'serviceSlug',
 * })
 * async listSessions(@Query('serviceSlug') serviceSlug: string) {}
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  SetMetadata,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationGrpcClient } from '../../grpc-clients';

/**
 * AuthzCheck decorator options
 */
export interface AuthzCheckOptions {
  /**
   * The relation to check (e.g., 'can_view', 'can_edit')
   */
  relation: string;

  /**
   * The object type (e.g., 'session_recording', 'service')
   */
  objectType: string;

  /**
   * Where to get the object ID from
   */
  objectIdFrom: 'query' | 'param' | 'body';

  /**
   * The key to extract the object ID
   */
  objectIdKey: string;

  /**
   * Where to get the user ID from (default: 'session')
   */
  userIdFrom?: 'session' | 'jwt';

  /**
   * The user type to use (default: 'admin')
   */
  userType?: string;

  /**
   * Custom error message
   */
  errorMessage?: string;
}

export const AUTHZ_CHECK_KEY = 'authz_check';

/**
 * AuthzCheck decorator
 */
export const AuthzCheck = (options: AuthzCheckOptions) => SetMetadata(AUTHZ_CHECK_KEY, options);

/**
 * AuthzCheck Guard
 */
@Injectable()
export class AuthzCheckGuard implements CanActivate {
  private readonly logger = new Logger(AuthzCheckGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly authzClient: AuthorizationGrpcClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get AuthzCheck options from decorator
    const options = this.reflector.get<AuthzCheckOptions>(AUTHZ_CHECK_KEY, context.getHandler());

    // If no options, skip the check (no decorator applied)
    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Get user ID
    const userId = this.getUserId(request, options.userIdFrom);
    if (!userId) {
      this.logger.warn('No user ID found for authorization check');
      throw new ForbiddenException('Authentication required');
    }

    // Get object ID
    const objectId = this.getObjectId(request, options);
    if (!objectId) {
      this.logger.warn(`Object ID not found: ${options.objectIdKey} from ${options.objectIdFrom}`);
      throw new ForbiddenException('Object not specified');
    }

    // Build user and object strings
    const userType = options.userType || 'admin';
    const user = `${userType}:${userId}`;
    const object = `${options.objectType}:${objectId}`;

    // Check authorization
    const allowed = await this.authzClient.check(user, options.relation, object);

    if (!allowed) {
      this.logger.debug(`Authorization denied: ${user} ${options.relation} ${object}`);
      throw new ForbiddenException(
        options.errorMessage ||
          `You don't have permission to ${options.relation} this ${options.objectType}`,
      );
    }

    this.logger.debug(`Authorization granted: ${user} ${options.relation} ${object}`);
    return true;
  }

  /**
   * Get user ID from request
   */
  private getUserId(request: any, source?: 'session' | 'jwt'): string | undefined {
    if (source === 'jwt') {
      // Get from JWT payload
      return request.user?.sub || request.user?.id;
    }

    // Default: Get from session
    return request.session?.admin?.id || request.session?.operator?.id || request.user?.id;
  }

  /**
   * Get object ID from request
   */
  private getObjectId(request: any, options: AuthzCheckOptions): string | undefined {
    switch (options.objectIdFrom) {
      case 'query':
        return request.query?.[options.objectIdKey];
      case 'param':
        return request.params?.[options.objectIdKey];
      case 'body':
        return request.body?.[options.objectIdKey];
      default:
        return undefined;
    }
  }
}

/**
 * Helper to check multiple permissions at once
 */
export interface MultiAuthzCheckOptions {
  checks: AuthzCheckOptions[];
  mode: 'all' | 'any';
}

export const MULTI_AUTHZ_CHECK_KEY = 'multi_authz_check';

/**
 * MultiAuthzCheck decorator for checking multiple permissions
 */
export const MultiAuthzCheck = (options: MultiAuthzCheckOptions) =>
  SetMetadata(MULTI_AUTHZ_CHECK_KEY, options);
