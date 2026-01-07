# Security Policy

> Input validation, authentication, and security best practices

## Input Validation

Always validate and sanitize user input using class-validator decorators:

```typescript
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @MaxLength(10000)
  content: string;
}
```

## Common Vulnerabilities & Prevention

| Vulnerability | Prevention Strategy                                          |
| ------------- | ------------------------------------------------------------ |
| SQL Injection | Prisma parameterized queries (never raw SQL with user input) |
| XSS           | DOMPurify for HTML, escape all output                        |
| CSRF          | SameSite cookies, CSRF tokens for state-changing operations  |
| File Upload   | MIME validation, 10MB limit, random filenames                |

## Rate Limiting

| Endpoint Type      | Limit        | Per         |
| ------------------ | ------------ | ----------- |
| Login/Register     | 5 requests   | minute/IP   |
| Authenticated APIs | 100 requests | minute/user |
| File Upload        | 10 requests  | minute/user |

## CORS Configuration

```typescript
app.enableCors({
  origin: ['https://mygirok.dev', 'https://admin.mygirok.dev'],
  credentials: true,
  maxAge: 3600,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
});
```

## Secrets Management

| DO                                          | DO NOT                            |
| ------------------------------------------- | --------------------------------- |
| Use ConfigService for environment variables | Commit secrets to git             |
| Rotate JWT keys every 90 days               | Hardcode secrets in code          |
| Use Sealed Secrets in Kubernetes            | Log sensitive data                |
| Use separate secrets per environment        | Share secrets across environments |

## JWT Token Policy

| Token Type    | Expiration | Storage Location |
| ------------- | ---------- | ---------------- |
| Access Token  | 15 minutes | localStorage     |
| Refresh Token | 14 days    | HttpOnly cookie  |

## Password Requirements

```yaml
minimum_length: 8
required_characters:
  - uppercase letter
  - lowercase letter
  - number
  - special character (!@#$%^&*)
hashing:
  algorithm: bcrypt
  rounds: 12
```

## Security Headers

```typescript
import helmet from 'helmet';

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }),
);
```

## Mobile Browser Considerations

| Browser          | Consideration                                       |
| ---------------- | --------------------------------------------------- |
| iOS Safari       | Requires explicit maxAge for CORS preflight caching |
| All Mobile       | Authorization header triggers preflight requests    |
| Public Endpoints | Skip auth headers in interceptor to avoid preflight |

---

**LLM Reference**: `docs/llm/policies/SECURITY.md`
