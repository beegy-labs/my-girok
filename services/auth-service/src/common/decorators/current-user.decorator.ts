import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const ctx = context.getType();

    if (ctx === 'http') {
      const request = context.switchToHttp().getRequest();
      return request.user;
    } else if (ctx === ('graphql' as any)) {
      const gqlContext = GqlExecutionContext.create(context);
      return gqlContext.getContext().req.user;
    }

    return null;
  },
);
