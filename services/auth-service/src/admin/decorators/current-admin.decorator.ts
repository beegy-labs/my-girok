import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AdminPayload } from '../types/admin.types';

/**
 * Decorator to extract current admin from request
 *
 * @example
 * @Get('profile')
 * getProfile(@CurrentAdmin() admin: AdminPayload) { ... }
 */
export const CurrentAdmin = createParamDecorator(
  (data: keyof AdminPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const admin = request.admin as AdminPayload;

    if (data) {
      return admin?.[data];
    }

    return admin;
  },
);
