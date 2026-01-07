# Security

## Input Validation

```typescript
@IsEmail() email: string;
@IsString() @MinLength(8) password: string;
@MaxLength(10000) content: string;
```

## Vulnerabilities

| Type          | Prevention                                |
| ------------- | ----------------------------------------- |
| SQL Injection | Prisma parameterized queries              |
| XSS           | DOMPurify, escape output                  |
| CSRF          | SameSite cookies, CSRF tokens             |
| File Upload   | MIME validation, 10MB limit, random names |

## Rate Limits

| Endpoint       | Limit        |
| -------------- | ------------ |
| Login/Register | 5/min/IP     |
| Auth           | 100/min/user |
| File Upload    | 10/min/user  |

## CORS

```typescript
app.enableCors({
  origin: ['https://mygirok.dev'],
  credentials: true,
  maxAge: 3600,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
});
```

## Secrets

| DO                         | DO NOT             |
| -------------------------- | ------------------ |
| ConfigService for env vars | Commit to git      |
| Rotate JWT every 90d       | Hardcode in code   |
| Sealed Secrets in K8s      | Log sensitive data |

## JWT

| Token   | Expiration | Storage         |
| ------- | ---------- | --------------- |
| Access  | 15min      | localStorage    |
| Refresh | 14d        | HttpOnly cookie |

## Password

```yaml
min_length: 8
requirements: [uppercase, lowercase, number, special]
hash: bcrypt(rounds=12)
```

## Headers

```typescript
app.use(
  helmet({
    contentSecurityPolicy: { directives: { defaultSrc: ["'self'"] } },
    hsts: { maxAge: 31536000, includeSubDomains: true },
  }),
);
```

## Mobile

| Browser          | Note                                    |
| ---------------- | --------------------------------------- |
| iOS Safari       | Explicit maxAge for preflight           |
| All              | Authorization header triggers preflight |
| Public endpoints | Skip auth headers in interceptor        |
