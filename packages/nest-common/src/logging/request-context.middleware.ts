import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * Request context stored in AsyncLocalStorage for access across async operations.
 */
export interface RequestContext {
  /** Unique request identifier for correlation */
  requestId: string;

  /** Request start timestamp for duration calculation */
  startTime: number;

  /** Actor ID (user or admin) */
  actorId?: string;

  /** Actor type */
  actorType?: 'user' | 'admin' | 'service' | 'system';

  /** Actor email */
  actorEmail?: string;

  /** Service ID for multi-tenant context */
  serviceId?: string;

  /** Session ID */
  sessionId?: string;

  /** UI event ID for frontend correlation */
  uiEventId?: string;

  /** OpenTelemetry trace ID */
  traceId?: string;

  /** OpenTelemetry span ID */
  spanId?: string;
}

/**
 * AsyncLocalStorage instance for request context propagation.
 * Allows accessing request context from anywhere in the request lifecycle
 * without passing it through function parameters.
 */
export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Get the current request context from AsyncLocalStorage.
 * Returns undefined if called outside of a request context.
 */
export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

/**
 * Get a specific field from the current request context.
 */
export function getRequestContextField<K extends keyof RequestContext>(
  key: K,
): RequestContext[K] | undefined {
  return requestContextStorage.getStore()?.[key];
}

/**
 * Run a function within a specific request context.
 * Useful for background jobs or message handlers that need context.
 */
export function runWithContext<T>(context: RequestContext, fn: () => T): T {
  return requestContextStorage.run(context, fn);
}

/**
 * Generate a unique request ID using crypto.randomUUID().
 * Falls back to a simple implementation if crypto is not available.
 */
function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older Node.js versions
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Express request with optional user/admin context from authentication.
 */
interface AuthenticatedRequest extends Request {
  user?: {
    sub?: string;
    email?: string;
    type?: string;
  };
  admin?: {
    sub?: string;
    email?: string;
  };
  requestId?: string;
}

/**
 * Middleware that initializes request context in AsyncLocalStorage.
 * Must be registered before any logging or tracing middleware.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    // Get or generate request ID
    const requestId =
      (req.headers['x-request-id'] as string) || req.requestId || generateRequestId();

    // Set request ID on request object and response header
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);

    // Build initial context (auth info added later by guards)
    const context: RequestContext = {
      requestId,
      startTime: Date.now(),
      sessionId: req.headers['x-session-id'] as string,
      uiEventId: req.headers['x-ui-event-id'] as string,
      traceId: req.headers['x-trace-id'] as string,
      spanId: req.headers['x-span-id'] as string,
    };

    // If user/admin is already set (e.g., by passport middleware)
    if (req.user) {
      context.actorId = req.user.sub;
      context.actorEmail = req.user.email;
      context.actorType = (req.user.type as RequestContext['actorType']) ?? 'user';
    } else if (req.admin) {
      context.actorId = req.admin.sub;
      context.actorEmail = req.admin.email;
      context.actorType = 'admin';
    }

    // Extract service ID from path params or headers
    const serviceIdMatch = req.path.match(/\/services\/([a-f0-9-]+)/i);
    if (serviceIdMatch) {
      context.serviceId = serviceIdMatch[1];
    } else if (req.headers['x-service-id']) {
      context.serviceId = req.headers['x-service-id'] as string;
    }

    // Run the rest of the request in this context
    requestContextStorage.run(context, () => {
      next();
    });
  }
}

/**
 * Update the current request context with additional fields.
 * Typically called after authentication to add actor info.
 */
export function updateRequestContext(updates: Partial<RequestContext>): void {
  const current = requestContextStorage.getStore();
  if (current) {
    Object.assign(current, updates);
  }
}
