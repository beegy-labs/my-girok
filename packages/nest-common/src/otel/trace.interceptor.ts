import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { trace, SpanStatusCode, Span, context as otelContext } from '@opentelemetry/api';
import { getRequestContext } from '../logging/request-context.middleware';

/**
 * Interceptor that adds custom span attributes for NestJS route handlers.
 *
 * This interceptor enriches the auto-created HTTP spans with additional
 * application-specific attributes like actor info, route template, and
 * business context.
 *
 * @example
 * ```typescript
 * // Use globally
 * app.useGlobalInterceptors(new TraceInterceptor());
 *
 * // Or per controller/route
 * @UseInterceptors(TraceInterceptor)
 * @Controller('users')
 * export class UsersController {}
 * ```
 */
@Injectable()
export class TraceInterceptor implements NestInterceptor {
  private readonly tracer = trace.getTracer('nest-common');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Get the current active span (created by HTTP instrumentation)
    const activeSpan = trace.getSpan(otelContext.active());

    if (activeSpan) {
      // Add route information
      const controllerPath = Reflect.getMetadata('path', controller) || '';
      const handlerPath = Reflect.getMetadata('path', handler) || '';
      const routeTemplate = `/${controllerPath}/${handlerPath}`.replace(/\/+/g, '/');

      activeSpan.setAttribute('http.route', routeTemplate);
      activeSpan.setAttribute('nest.controller', controller.name);
      activeSpan.setAttribute('nest.handler', handler.name);

      // Add request context attributes
      const reqContext = getRequestContext();
      if (reqContext) {
        if (reqContext.actorId) {
          activeSpan.setAttribute('user.id', reqContext.actorId);
        }
        if (reqContext.actorType) {
          activeSpan.setAttribute('user.type', reqContext.actorType);
        }
        if (reqContext.serviceId) {
          activeSpan.setAttribute('service.id', reqContext.serviceId);
        }
        if (reqContext.sessionId) {
          activeSpan.setAttribute('session.id', reqContext.sessionId);
        }
      }

      // Add request ID for correlation
      if (request.requestId) {
        activeSpan.setAttribute('request.id', request.requestId);
      }
    }

    return next.handle().pipe(
      tap(() => {
        // On success, span status is automatically set by HTTP instrumentation
      }),
      catchError((error) => {
        if (activeSpan) {
          activeSpan.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message,
          });
          activeSpan.recordException(error);
        }
        throw error;
      }),
    );
  }
}

/**
 * Create a custom span for a specific operation.
 * Useful for instrumenting business logic within a request.
 *
 * @param name - Span name (e.g., 'db.query', 'external.api.call')
 * @param fn - Function to execute within the span
 * @param attributes - Optional span attributes
 *
 * @example
 * ```typescript
 * const result = await withSpan('db.findUser', async (span) => {
 *   span.setAttribute('user.id', userId);
 *   return await this.userRepo.findOne(userId);
 * }, { 'db.operation': 'SELECT' });
 * ```
 */
export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  attributes?: Record<string, string | number | boolean>,
): Promise<T> {
  const tracer = trace.getTracer('nest-common');

  return tracer.startActiveSpan(name, async (span) => {
    try {
      // Add provided attributes
      if (attributes) {
        for (const [key, value] of Object.entries(attributes)) {
          span.setAttribute(key, value);
        }
      }

      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      if (error instanceof Error) {
        span.recordException(error);
      }
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Decorator to automatically trace a method.
 *
 * @param spanName - Optional custom span name (defaults to ClassName.methodName)
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   @Trace()
 *   async findUser(id: string): Promise<User> {
 *     return this.repo.findOne(id);
 *   }
 *
 *   @Trace('custom.operation.name')
 *   async complexOperation(): Promise<void> {
 *     // ...
 *   }
 * }
 * ```
 */
export function Trace(spanName?: string): MethodDecorator {
  return (target, propertyKey, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    const name = spanName ?? `${target.constructor.name}.${String(propertyKey)}`;

    descriptor.value = async function (...args: unknown[]) {
      return withSpan(name, async () => {
        return originalMethod.apply(this, args);
      });
    };

    return descriptor;
  };
}
