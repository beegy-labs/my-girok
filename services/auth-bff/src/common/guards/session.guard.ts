import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { SessionService } from '../../session/session.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { REQUIRE_MFA_KEY } from '../decorators/require-mfa.decorator';
import { ACCOUNT_TYPES_KEY } from '../decorators/account-type.decorator';
import { AccountType } from '../../config/constants';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessionService: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    // Validate session
    const result = await this.sessionService.validateSession(request);

    if (!result.valid || !result.session) {
      throw new UnauthorizedException(result.error || 'Session required');
    }

    // Attach session to request
    (request as Request & { session: typeof result.session }).session = result.session;

    // Check MFA requirement
    const requireMfa = this.reflector.getAllAndOverride<boolean>(REQUIRE_MFA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requireMfa && !result.session.mfaVerified) {
      throw new ForbiddenException('MFA verification required');
    }

    // Check account type restriction
    const allowedTypes = this.reflector.getAllAndOverride<AccountType[]>(ACCOUNT_TYPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (allowedTypes && allowedTypes.length > 0) {
      if (!allowedTypes.includes(result.session.accountType)) {
        throw new ForbiddenException('Access denied for this account type');
      }
    }

    return true;
  }
}
