import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extract current user from request
 * Supports both HTTP and GraphQL contexts
 *
 * @example
 * ```typescript
 * @Get('profile')
 * async getProfile(@CurrentUser() user: any) {
 *   return user;
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const ctx = context.getType();

    if (ctx === 'http') {
      const request = context.switchToHttp().getRequest();
      return request.user;
    }

    // Support GraphQL if available (optional dependency)
    if (ctx === ('graphql' as any)) {
      try {
        // Dynamic import to avoid hard dependency on @nestjs/graphql
        const { GqlExecutionContext } = require('@nestjs/graphql');
        const gqlContext = GqlExecutionContext.create(context);
        return gqlContext.getContext().req.user;
      } catch (_error) {
        // @nestjs/graphql not installed, fallback to null
        return null;
      }
    }

    return null;
  },
);
