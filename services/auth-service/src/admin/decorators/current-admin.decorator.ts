import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AdminPayload } from '../types/admin.types';
import { AuthenticatedAdmin, isAuthenticatedAdmin } from '@my-girok/types';

/**
 * Decorator to extract current admin from request
 * Supports both legacy request.admin and new request.user from UnifiedAuthGuard
 *
 * @example
 * @Get('profile')
 * getProfile(@CurrentAdmin() admin: AdminPayload) { ... }
 */
export const CurrentAdmin = createParamDecorator(
  (data: keyof AdminPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    // Support both legacy request.admin and new request.user from UnifiedAuthGuard
    let admin: AdminPayload | undefined;

    if (request.admin) {
      // Legacy format
      admin = request.admin as AdminPayload;
    } else if (request.user && isAuthenticatedAdmin(request.user)) {
      // New format from UnifiedAuthGuard - map to AdminPayload for backward compatibility
      const authAdmin = request.user as AuthenticatedAdmin;
      admin = {
        sub: authAdmin.id,
        email: authAdmin.email,
        name: authAdmin.name,
        type: 'ADMIN_ACCESS',
        accountMode: 'SERVICE', // Default, can be extended
        scope: authAdmin.scope,
        tenantId: authAdmin.tenantId,
        roleId: authAdmin.roleId,
        roleName: authAdmin.roleName,
        level: authAdmin.level,
        permissions: authAdmin.permissions,
        services: authAdmin.services,
      };
    }

    if (data) {
      return admin?.[data];
    }

    return admin;
  },
);
