import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { OperatorPayload } from '../types/operator.types';

export const CurrentOperator = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): OperatorPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as OperatorPayload;
  },
);
