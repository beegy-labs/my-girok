import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_SERVICE_KEY } from '../decorators/require-service.decorator';
import { AuthenticatedEntity, isAuthenticatedUser } from '@my-girok/types';

/**
 * Guard to check if user has joined the required service
 * Issue: #358
 */
@Injectable()
export class ServiceAccessGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredService = this.reflector.getAllAndOverride<string | undefined>(
      REQUIRE_SERVICE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredService) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedEntity;

    if (!user || !isAuthenticatedUser(user)) {
      throw new ForbiddenException('User authentication required');
    }

    // Get service slug from param if dynamic
    const serviceSlug = requiredService === 'dynamic' ? request.params.slug : requiredService;

    if (!serviceSlug) {
      throw new ForbiddenException('Service slug is required');
    }

    // Check if user has joined this service
    if (!user.services[serviceSlug]) {
      throw new ForbiddenException(`Not joined to service: ${serviceSlug}`);
    }

    if (user.services[serviceSlug].status !== 'ACTIVE') {
      throw new ForbiddenException(`Service access suspended: ${serviceSlug}`);
    }

    return true;
  }
}
