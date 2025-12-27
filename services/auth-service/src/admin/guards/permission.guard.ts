import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { AuthenticatedAdmin, isAuthenticatedAdmin } from '@my-girok/types';
import { matchesPermission } from '../config/permissions.config';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No permissions required
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    // Support both legacy request.admin and new request.user from UnifiedAuthGuard
    const user = request.user || request.admin;

    if (!user) {
      throw new ForbiddenException('Admin context not found');
    }

    // Check if user is an admin (from UnifiedAuthGuard)
    if (!isAuthenticatedAdmin(user)) {
      throw new ForbiddenException('Admin authentication required');
    }

    const admin = user as AuthenticatedAdmin;

    // System Super Admin (role with '*' permission) bypasses all checks
    if (admin.permissions.includes('*')) {
      return true;
    }

    // Check if admin has all required permissions
    const hasAllPermissions = requiredPermissions.every((required) =>
      admin.permissions.some((perm) => matchesPermission(perm, required)),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException(
        `Missing required permissions: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
