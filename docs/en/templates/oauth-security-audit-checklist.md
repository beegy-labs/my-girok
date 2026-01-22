# OAuth Security Audit Checklist

**Scope**: OAuth Authentication
**Date**: 2026-01-17

This checklist provides a comprehensive security audit guide for OAuth implementations.

## 1. Injection Prevention

### SQL Injection

- [ ] Test OAuth provider name injection (`'; DROP TABLE...`)
- [ ] Test client ID injection (`" OR 1=1 --`)
- [ ] Verify Prisma parameterized queries are used consistently

### Cross-Site Scripting (XSS)

- [ ] Test provider display name for XSS (`<script>alert('XSS')</script>`)
- [ ] Test error message handling for XSS vulnerabilities
- [ ] Verify CSP headers block inline scripts

## 2. CSRF Protection

- [ ] OAuth state parameter is validated on callback
- [ ] CSRF tokens are required on settings updates
- [ ] SameSite cookie attribute is set (`Strict` or `Lax`)

## 3. Rate Limiting

- [ ] OAuth initiation: 20-50 requests/min limit enforced
- [ ] Provider toggle: Per-user/IP limit applied
- [ ] Credentials update: 5-10 requests/min limit
- [ ] OAuth callback: DoS prevention measures in place

## 4. Session Security

- [ ] Session is regenerated after OAuth login
- [ ] Session is properly invalidated on logout

## 5. Cookie Flags

- [ ] `HttpOnly=true` - Prevents JavaScript access
- [ ] `Secure=true` - HTTPS only (production)
- [ ] `SameSite=Strict` or `Lax` - CSRF protection

## 6. Error Handling

- [ ] No sensitive data exposed in error messages
- [ ] Generic error messages used (no schema details)
- [ ] No secrets written to logs

## 7. OAuth Flow Security

- [ ] Authorization code is one-time use only
- [ ] Authorization code expires within 10 minutes
- [ ] State parameter is properly validated
- [ ] Access token is never included in URL
- [ ] Refresh token rotation is implemented

## 8. Encryption

- [ ] Client secrets are encrypted at rest
- [ ] AES-256-GCM encryption with 16-byte IV/tag
- [ ] Encryption key stored in environment/secrets manager

## 9. Role-Based Access Control (RBAC)

- [ ] MASTER role required for OAuth settings management
- [ ] Non-MASTER users blocked from provider toggle/credentials
- [ ] Unauthenticated access blocked completely

## 10. Callback URL Validation

- [ ] External domains are rejected
- [ ] Protocol-relative URLs are rejected
- [ ] Localhost accepted (development environment only)
- [ ] HTTPS required (production environment)

## Quick Reference

| Category                | Items | Priority |
| ----------------------- | ----- | -------- |
| Injection Prevention    | 6     | Critical |
| CSRF Protection         | 3     | High     |
| Rate Limiting           | 4     | High     |
| Session Security        | 2     | High     |
| Cookie Security         | 3     | High     |
| Error Handling          | 3     | Medium   |
| OAuth Flow              | 5     | Critical |
| Encryption              | 3     | Critical |
| RBAC                    | 3     | High     |
| Callback URL Validation | 4     | High     |

## Related Documentation

- **Full Checklist with Penetration Testing**: See `oauth-security-audit-full.md`

---

_This document is auto-generated from `docs/llm/templates/oauth-security-audit-checklist.md`_
