# API Gateway

> Optional centralized routing and middleware layer

## Purpose

Provides single entry point for all clients, handles cross-cutting concerns like authentication, rate limiting, and logging. **Can be bypassed if BFFs handle everything.**

## Tech Stack

- **Framework**: NestJS 11 + TypeScript 5.7
- **Proxy**: http-proxy-middleware
- **Rate Limiting**: @nestjs/throttler
- **Monitoring**: Prometheus, Winston

## When to Use

**Use Gateway When:**
- Need centralized auth/rate limiting across ALL services
- Want single entry point for external clients
- Need request/response logging in one place

**Skip Gateway When:**
- BFFs can handle auth and rate limiting
- Prefer distributed concerns
- Want to minimize latency

## Routing Configuration

```typescript
// src/gateway/routes.config.ts
export const ROUTES = {
  auth: {
    prefix: '/api/auth',
    target: process.env.AUTH_SERVICE_URL,
    public: true,  // No auth required
  },
  content: {
    prefix: '/api/content',
    target: process.env.CONTENT_SERVICE_URL,
    public: false, // Auth required
  },
  webBff: {
    prefix: '/api/web',
    target: process.env.WEB_BFF_URL,
    public: false,
  },
  mobileBff: {
    prefix: '/api/mobile',
    target: process.env.MOBILE_BFF_URL,
    public: false,
  },
  llm: {
    prefix: '/api/ai',
    target: process.env.LLM_SERVICE_URL,
    public: false,
  },
};
```

## Middleware Order

```typescript
1. CORS handling
2. Request logging
3. Rate limiting (by IP/User)
4. JWT validation (if route not public)
5. Route to appropriate service
6. Response transformation
7. Error handling
```

## Implementation

### Proxy Setup

```typescript
import { createProxyMiddleware } from 'http-proxy-middleware';

@Injectable()
export class GatewayService {
  createProxy(route: RouteConfig) {
    return createProxyMiddleware({
      target: route.target,
      changeOrigin: true,
      pathRewrite: {
        [`^${route.prefix}`]: '',
      },
      onProxyReq: (proxyReq, req) => {
        // Forward user info
        if (req.user) {
          proxyReq.setHeader('X-User-Id', req.user.id);
          proxyReq.setHeader('X-User-Role', req.user.role);
        }
      },
      onError: (err, req, res) => {
        this.logger.error(`Proxy error: ${err.message}`);
        res.status(503).json({ error: 'Service unavailable' });
      },
    });
  }
}
```

### JWT Validation

```typescript
@Injectable()
export class JwtValidationMiddleware implements NestMiddleware {
  constructor(private jwtService: JwtService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const route = this.getRouteConfig(req.path);

    // Skip validation for public routes
    if (route.public) {
      return next();
    }

    const token = this.extractToken(req);
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      req.user = payload; // Attach user to request
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }

  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  }
}
```

### Rate Limiting

```typescript
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,      // 60 seconds
      limit: 100,   // 100 requests per 60s
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class GatewayModule {}

// Custom rate limits per endpoint
@Throttle(5, 60) // 5 requests per minute
@Post('auth/login')
async login() {
  // ...
}
```

### Request Logging

```typescript
@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { method, originalUrl, ip } = req;
      const { statusCode } = res;

      this.logger.log({
        method,
        url: originalUrl,
        statusCode,
        duration: `${duration}ms`,
        ip,
        userAgent: req.get('user-agent'),
        userId: req.user?.id,
      });

      // Alert on slow requests
      if (duration > 1000) {
        this.logger.warn(`Slow request: ${method} ${originalUrl} - ${duration}ms`);
      }
    });

    next();
  }
}
```

## Environment Variables

```bash
AUTH_SERVICE_URL=http://auth-service:3000
CONTENT_SERVICE_URL=http://content-api:3000
WEB_BFF_URL=http://web-bff:3000
MOBILE_BFF_URL=http://mobile-bff:3000
LLM_SERVICE_URL=http://llm-api:8000
JWT_SECRET=same-as-auth-service
CORS_ORIGINS=https://mygirok.dev,https://admin.mygirok.dev
```

## CORS Configuration

```typescript
app.enableCors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://mygirok.dev', 'https://admin.mygirok.dev']
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

## Health Check

```typescript
@Get('health')
async healthCheck() {
  const services = await Promise.all([
    this.checkService('auth', AUTH_SERVICE_URL),
    this.checkService('content', CONTENT_SERVICE_URL),
    this.checkService('web-bff', WEB_BFF_URL),
  ]);

  const allHealthy = services.every(s => s.status === 'up');

  return {
    status: allHealthy ? 'ok' : 'degraded',
    services,
    timestamp: new Date(),
  };
}
```

## Monitoring

- Prometheus metrics (/metrics)
- Request duration histogram
- Error rate counter
- Active connections gauge
- Service health status

## Security

- HTTPS only in production
- Security headers (helmet)
- Rate limiting per IP/User
- JWT validation
- Request size limits (10MB)
- Timeout: 30 seconds

## Performance

- Connection pooling to backend services
- Keep-alive connections
- Response compression (gzip)
- Circuit breaker pattern (optional)
