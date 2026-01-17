import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedAdmin, isAuthenticatedAdmin } from '@my-girok/types';

/**
 * Decorator to extract authenticated admin's ID from request
 * Type-safe alternative to (req.user as any).id
 *
 * @example
 * ```typescript
 * @Get('profile')
 * async getProfile(@AdminId() adminId: string) {
 *   return this.service.getProfile(adminId);
 * }
 * ```
 */
export const AdminId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();

  // Support both legacy request.admin and new request.user from UnifiedAuthGuard
  if (request.admin?.sub) {
    return request.admin.sub;
  }

  if (request.user && isAuthenticatedAdmin(request.user)) {
    const authAdmin = request.user as AuthenticatedAdmin;
    return authAdmin.id;
  }

  // Fallback for backward compatibility (should not reach here with proper guards)
  if (request.user?.id) {
    return request.user.id;
  }

  throw new Error('Admin ID not found in request. Ensure AdminAuthGuard is applied.');
});
