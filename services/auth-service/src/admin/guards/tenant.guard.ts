import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AdminPayload } from '../types/admin.types';

/**
 * Guard to ensure tenant-scoped admins can only access their own tenant data
 *
 * Usage:
 * - For routes with :tenantId param, validates admin has access
 * - System scope admins bypass this check
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const admin = request.admin as AdminPayload;

    if (!admin) {
      throw new ForbiddenException('Admin context not found');
    }

    // System scope admins can access any tenant
    if (admin.scope === 'SYSTEM') {
      return true;
    }

    // For tenant scope, check if accessing own tenant
    const tenantId = request.params?.tenantId || request.body?.tenantId;

    if (tenantId && tenantId !== admin.tenantId) {
      throw new ForbiddenException('Cannot access other tenant data');
    }

    return true;
  }
}
