import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  REQUIRE_ACCOUNT_TYPE_KEY,
  AccountType,
} from '../decorators/require-account-type.decorator';
import { AuthenticatedEntity } from '@my-girok/types';

/**
 * Guard to check if authenticated entity matches required account type
 * Issue: #358
 */
@Injectable()
export class AccountTypeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredTypes = this.reflector.getAllAndOverride<AccountType[] | undefined>(
      REQUIRE_ACCOUNT_TYPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredTypes || requiredTypes.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedEntity;

    if (!user || !requiredTypes.includes(user.type)) {
      throw new ForbiddenException(
        `Access denied. Required account type: ${requiredTypes.join(' or ')}`,
      );
    }

    return true;
  }
}
