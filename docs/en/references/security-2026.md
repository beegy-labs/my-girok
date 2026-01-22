# Security Best Practices - 2026

This guide covers application security best practices as of 2026, including OWASP Top 10 mitigations, DevSecOps integration, and compliance requirements.

## OWASP Top 10 (2025/2026)

| Rank | Risk                        | Mitigation                                    |
| ---- | --------------------------- | --------------------------------------------- |
| 1    | Broken Access Control       | RBAC, least privilege, authorization checks   |
| 2    | Cryptographic Failures      | TLS 1.3, strong encryption, key management    |
| 3    | Injection                   | Parameterized queries, input validation       |
| 4    | Insecure Design             | Threat modeling, security architecture review |
| 5    | Security Misconfiguration   | Hardened defaults, minimal attack surface     |
| 6    | Vulnerable Components       | SCA, SBOM, regular dependency updates         |
| 7    | Authentication Failures     | MFA, strong passwords, rate limiting          |
| 8    | Software Integrity Failures | Code signing, supply chain verification       |
| 9    | Logging Failures            | Audit logs, monitoring, alerting              |
| 10   | SSRF                        | URL validation, network segmentation          |

## DevSecOps Pipeline

Security must be integrated throughout the development pipeline:

```
Code → SAST → Build → SCA → Deploy → DAST → Monitor
        ↓           ↓              ↓
    CodeQL      Snyk/Trivy    OWASP ZAP
```

### Security Tools Integration

| Phase      | Tool                    | Purpose                  |
| ---------- | ----------------------- | ------------------------ |
| Pre-commit | ESLint security plugins | Code pattern checks      |
| CI         | CodeQL (SAST)           | Static code analysis     |
| CI         | Snyk/Trivy (SCA)        | Dependency scanning      |
| CD         | OWASP ZAP (DAST)        | Runtime security testing |
| Runtime    | Falco                   | Container monitoring     |

## Input Validation

### API Boundary Validation

Always validate input at API boundaries using class-validator:

```typescript
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
// SAFE: Parameterized queries with Prisma
const user = await prisma.user.findUnique({
  where: { id: userId }, // Prisma auto-escapes
});

// SAFE: Raw query with parameters
await prisma.$queryRaw`
  SELECT * FROM users WHERE id = ${userId}
`;

// DANGEROUS: String concatenation
await prisma.$queryRawUnsafe(`SELECT * FROM users WHERE id = '${userId}'`);
```

### XSS Prevention

```typescript
// React auto-escapes by default - this is safe
return <div>{userInput}</div>;

// Only use when absolutely necessary, with sanitization
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(dirty);
return <div dangerouslySetInnerHTML={{ __html: clean }} />;
```

## Authentication Best Practices

| Practice         | Implementation                             |
| ---------------- | ------------------------------------------ |
| Password hashing | bcrypt (cost 12+) or Argon2id              |
| Session tokens   | Cryptographically random, 256-bit          |
| JWT              | Short expiry (15m), refresh tokens, RS256  |
| MFA              | TOTP preferred, WebAuthn for high security |
| Rate limiting    | 5 attempts / 15 minutes                    |

### JWT Security

```typescript
// Short-lived access tokens
const accessToken = jwt.sign(payload, secret, { expiresIn: '15m' });

// Longer refresh tokens (stored securely)
const refreshToken = jwt.sign(payload, secret, { expiresIn: '7d' });

// Always validate audience and issuer
jwt.verify(token, secret, {
  audience: 'my-app',
  issuer: 'auth.my-app.com',
});
```

## Supply Chain Security

### SBOM (Software Bill of Materials)

Generate and maintain an SBOM for your application:

```bash
# Generate SBOM
npx @cyclonedx/cyclonedx-npm --output-file sbom.json

# Scan for vulnerabilities
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

| Level       | Solution                            |
| ----------- | ----------------------------------- |
| Development | .env files (gitignored)             |
| CI/CD       | GitHub Secrets, GitLab CI variables |
| Production  | HashiCorp Vault, Sealed Secrets     |
| Kubernetes  | External Secrets Operator           |

### Kubernetes Sealed Secret Example

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: database-credentials
spec:
  encryptedData:
    password: AgBy3i4OJSWK+... # Encrypted value
```

## API Security

| Protection    | Implementation                           |
| ------------- | ---------------------------------------- |
| Rate limiting | Token bucket or sliding window algorithm |
| CORS          | Explicit allowlist of origins            |
| CSRF          | SameSite cookies, anti-CSRF tokens       |
| Headers       | Helmet.js, Content Security Policy       |

### Security Headers with Helmet

```typescript
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

## Compliance Requirements (2026)

| Regulation              | Effective Date | Key Requirements                            |
| ----------------------- | -------------- | ------------------------------------------- |
| EU Cyber Resilience Act | Late 2026      | SBOM mandatory, vulnerability handling      |
| CISA SBOM Guidelines    | 2025+          | Minimum SBOM elements for federal suppliers |
| NIS2 Directive          | October 2024   | Incident reporting, risk management         |

## Sources

- [OWASP Top Ten Project](https://owasp.org/www-project-top-ten/)
- [Web Application Security Best Practices](https://www.radware.com/cyberpedia/application-security/web-application-security-best-practices/)
- [DevSecOps Trends 2026](https://debuglies.com/2026/01/07/devsecops-trends-2026-ai-agents-revolutionizing-secure-software-development/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)

---

_Last Updated: 2026-01-22_
