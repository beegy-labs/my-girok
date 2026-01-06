# Security Policies

> CRITICAL: All developers MUST follow these guidelines

## Input Validation

```typescript
// Use class-validator decorators
@IsEmail() email: string;
@IsString() @MinLength(8) password: string;
@MaxLength(10000) content: string;
```

## Common Vulnerabilities

| Vulnerability | Prevention                                       |
| ------------- | ------------------------------------------------ |
| SQL Injection | Use Prisma parameterized queries                 |
| XSS           | Sanitize HTML (DOMPurify), escape output         |
| CSRF          | SameSite cookies, CSRF tokens                    |
| File Upload   | Validate MIME type, 10MB limit, random filenames |

## Rate Limiting

| Endpoint       | Limit            |
| -------------- | ---------------- |
| Login/Register | 5 req/min/IP     |
| Auth endpoints | 100 req/min/user |
| File uploads   | 10 req/min/user  |

## CORS Configuration

```typescript
app.enableCors({
  origin: ['https://mygirok.dev'],
  credentials: true,
  maxAge: 3600, // iOS Safari preflight cache
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
});
```

## Secrets Management

**NEVER:**

- ❌ Commit secrets to git
- ❌ Hardcode secrets in code
- ❌ Log sensitive data

**ALWAYS:**

- ✅ Use `ConfigService` for env vars
- ✅ Rotate JWT secrets every 90 days
- ✅ Use Sealed Secrets in K8s

## JWT Configuration

| Token   | Expiration | Storage         |
| ------- | ---------- | --------------- |
| Access  | 15 min     | localStorage    |
| Refresh | 14 days    | HttpOnly cookie |

## Password Policy

- Minimum 8 characters
- Uppercase, lowercase, number, special char
- bcrypt with 12 rounds

## Security Headers

```typescript
app.use(
  helmet({
    contentSecurityPolicy: { directives: { defaultSrc: ["'self'"] } },
    hsts: { maxAge: 31536000, includeSubDomains: true },
  }),
);
```

## Mobile Browser Notes

- iOS Safari: Needs explicit `maxAge` for preflight caching
- Authorization header always triggers preflight
- Public endpoints: Skip auth headers in interceptor

---

**Contact**: security@mygirok.dev
