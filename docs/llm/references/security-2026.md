# Security - 2026 Best Practices

> OWASP, DevSecOps, application security | **Updated**: 2026-01-22

## OWASP Top 10 (2025/2026)

| Rank | Risk                        | Mitigation                                  |
| ---- | --------------------------- | ------------------------------------------- |
| 1    | Broken Access Control       | RBAC, least privilege, authorization checks |
| 2    | Cryptographic Failures      | TLS 1.3, strong encryption, key management  |
| 3    | Injection                   | Parameterized queries, input validation     |
| 4    | Insecure Design             | Threat modeling, security architecture      |
| 5    | Security Misconfiguration   | Hardened defaults, minimal attack surface   |
| 6    | Vulnerable Components       | SCA, SBOM, dependency updates               |
| 7    | Authentication Failures     | MFA, strong passwords, rate limiting        |
| 8    | Software Integrity Failures | Code signing, supply chain verification     |
| 9    | Logging Failures            | Audit logs, monitoring, alerting            |
| 10   | SSRF                        | URL validation, network segmentation        |

## DevSecOps Pipeline

```
Code → SAST → Build → SCA → Deploy → DAST → Monitor
        ↓           ↓              ↓
    CodeQL      Snyk/Trivy    OWASP ZAP
```

### Security Tools Integration

| Phase      | Tool             | Purpose              |
| ---------- | ---------------- | -------------------- |
| Pre-commit | ESLint security  | Code patterns        |
| CI         | CodeQL (SAST)    | Static analysis      |
| CI         | Snyk/Trivy (SCA) | Dependency scan      |
| CD         | OWASP ZAP (DAST) | Runtime testing      |
| Runtime    | Falco            | Container monitoring |

## Input Validation

### API Boundaries

```typescript
// NestJS + class-validator
export class CreateUserDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}
```

### SQL Injection Prevention

```typescript
// ✅ Parameterized queries
const user = await prisma.user.findUnique({
  where: { id: userId }, // Prisma auto-escapes
});

// ✅ Raw query with parameters
await prisma.$queryRaw`
  SELECT * FROM users WHERE id = ${userId}
`;

// ❌ String concatenation
await prisma.$queryRawUnsafe(`SELECT * FROM users WHERE id = '${userId}'`);
```

### XSS Prevention

```typescript
// React auto-escapes by default
return <div>{userInput}</div>;  // ✅ Safe

// Dangerous: Only when absolutely necessary
return <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;

// Use DOMPurify for sanitization
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(dirty);
```

## Authentication Best Practices

| Practice         | Implementation                      |
| ---------------- | ----------------------------------- |
| Password hashing | bcrypt (cost 12+) or Argon2id       |
| Session tokens   | Cryptographically random, 256-bit   |
| JWT              | Short expiry, refresh tokens, RS256 |
| MFA              | TOTP, WebAuthn preferred            |
| Rate limiting    | 5 attempts / 15 minutes             |

### JWT Security

```typescript
// Short-lived access tokens
const accessToken = jwt.sign(payload, secret, { expiresIn: '15m' });

// Longer refresh tokens (stored securely)
const refreshToken = jwt.sign(payload, secret, { expiresIn: '7d' });

// Validate audience and issuer
jwt.verify(token, secret, {
  audience: 'my-app',
  issuer: 'auth.my-app.com',
});
```

## Supply Chain Security

### SBOM (Software Bill of Materials)

```bash
# Generate SBOM
npx @cyclonedx/cyclonedx-npm --output-file sbom.json

# Scan dependencies
npx snyk test
trivy fs --scanners vuln .
```

### Dependency Management

| Practice               | Tool                              |
| ---------------------- | --------------------------------- |
| Vulnerability scanning | Snyk, Dependabot                  |
| License compliance     | FOSSA, Snyk                       |
| Lock files             | package-lock.json, pnpm-lock.yaml |
| Signature verification | npm audit signatures              |

## Secrets Management

| Level       | Solution                        |
| ----------- | ------------------------------- |
| Development | .env (gitignored)               |
| CI/CD       | GitHub Secrets                  |
| Production  | HashiCorp Vault, Sealed Secrets |
| Kubernetes  | External Secrets Operator       |

```yaml
# Kubernetes Sealed Secret
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: database-credentials
spec:
  encryptedData:
    password: AgBy3i4OJSWK+... # Encrypted
```

## API Security

| Protection    | Implementation               |
| ------------- | ---------------------------- |
| Rate limiting | Token bucket, sliding window |
| CORS          | Explicit allowlist           |
| CSRF          | SameSite cookies, tokens     |
| Headers       | Helmet.js, CSP               |

### Security Headers

```typescript
// NestJS Helmet
import helmet from 'helmet';

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true },
  }),
);
```

## Compliance (2026)

| Regulation              | Effective | Requirements                        |
| ----------------------- | --------- | ----------------------------------- |
| EU Cyber Resilience Act | Late 2026 | SBOM, vulnerability handling        |
| CISA SBOM Guidelines    | 2025+     | Minimum SBOM elements               |
| NIS2 Directive          | Oct 2024  | Incident reporting, risk management |

## Sources

- [OWASP Top Ten](https://owasp.org/www-project-top-ten/)
- [Web Application Security Best Practices](https://www.radware.com/cyberpedia/application-security/web-application-security-best-practices/)
- [DevSecOps Trends 2026](https://debuglies.com/2026/01/07/devsecops-trends-2026-ai-agents-revolutionizing-secure-software-development/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
