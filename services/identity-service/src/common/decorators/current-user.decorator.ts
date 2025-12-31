import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest, JwtPayload } from '../guards/jwt-auth.guard';

/**
 * Decorator to extract current user from request
 * Can be used to get the full JWT payload or specific fields
 *
 * @example
 * // Get full user payload
 * @CurrentUser() user: JwtPayload
 *
 * @example
 * // Get specific field
 * @CurrentUser('sub') accountId: string
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      return undefined;
    }

    return data ? user[data] : user;
  },
);

/**
 * Decorator to extract account ID from the authenticated request
 */
export const CurrentAccountId = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.accountId || request.user?.sub;
});
