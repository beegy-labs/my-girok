# OAuth Security Audit Checklist

> **Scope**: OAuth Authentication | **Date**: 2026-01-17

## 1. Injection Prevention

### SQL Injection

- [ ] Test OAuth provider name injection (`'; DROP TABLE...`)
- [ ] Test client ID injection (`" OR 1=1 --`)
- [ ] Verify Prisma parameterized queries

### XSS

- [ ] Test provider display name XSS (`<script>alert('XSS')</script>`)
- [ ] Test error message XSS
- [ ] Verify CSP headers block inline scripts

## 2. CSRF Protection

- [ ] OAuth state parameter validation
- [ ] CSRF tokens on settings updates
- [ ] SameSite cookie attribute (`Strict` or `Lax`)

## 3. Rate Limiting

- [ ] OAuth initiation: 20-50 requests/min limit
- [ ] Provider toggle: Per-user/IP limit
- [ ] Credentials update: 5-10 requests/min limit
- [ ] OAuth callback: DoS prevention

## 4. Session Security

- [ ] Session regeneration after OAuth login
- [ ] Session invalidation on logout

## 5. Cookie Flags

- [ ] `HttpOnly=true`
- [ ] `Secure=true` (production)
- [ ] `SameSite=Strict` or `Lax`

## 6. Error Handling

- [ ] No sensitive data in error messages
- [ ] Generic error messages (no schema details)
- [ ] No secrets in logs

## 7. OAuth Flow Security

- [ ] Authorization code one-time use
- [ ] Code expiration (10 min)
- [ ] State parameter validation
- [ ] Access token not in URL
- [ ] Refresh token rotation

## 8. Encryption

- [ ] Client secrets encrypted at rest
- [ ] AES-256-GCM with 16-byte IV/tag
- [ ] Key in environment/secrets manager

## 9. RBAC

- [ ] MASTER role required for OAuth settings
- [ ] Non-MASTER blocked from provider toggle/credentials
- [ ] Unauthenticated access blocked

## 10. Callback URL Validation

- [ ] Reject external domains
- [ ] Reject protocol-relative URLs
- [ ] Accept localhost (dev only)
- [ ] Require HTTPS (production)

---

_Full checklist: `oauth-security-audit-full.md`_
