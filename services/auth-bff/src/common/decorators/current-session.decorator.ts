import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { BffSession } from '../types';

/**
 * Extracts the current session from the request
 */
export const CurrentSession = createParamDecorator(
  (data: keyof BffSession | undefined, ctx: ExecutionContext): BffSession | unknown => {
    const request = ctx.switchToHttp().getRequest();
    const session = request.session as BffSession;

    return data ? session?.[data] : session;
  },
);
