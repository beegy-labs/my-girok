# OAuth Security Audit - Full Checklist

> Detailed tests for OAuth security audit

## CSP & Clickjacking

- [ ] `Content-Security-Policy` header present
- [ ] No `unsafe-inline` or `unsafe-eval`
- [ ] `X-Frame-Options: DENY` or `SAMEORIGIN`
- [ ] `frame-ancestors 'none'` or `'self'`

## Penetration Testing

### Brute Force

- [ ] OAuth callback brute force (1000 invalid codes)
- [ ] Provider enumeration (only enabled providers visible)

### State Manipulation

- [ ] Modified state parameter rejected
- [ ] Reused state parameter rejected

### Open Redirect

- [ ] `returnUrl` parameter sanitized to local path
- [ ] `redirect_uri` modification rejected

## Provider-Specific

### Google

- [ ] Only `email` and `profile` scopes requested

### Apple

- [ ] `response_mode=form_post` used (not GET)

### Kakao/Naver

- [ ] HTTPS only for callback URLs
- [ ] Valid SSL certificates

## Compliance

### OWASP Top 10

- [x] A01:2021 – Broken Access Control
- [x] A02:2021 – Cryptographic Failures
- [x] A03:2021 – Injection
- [x] A05:2021 – Security Misconfiguration
- [x] A07:2021 – Auth Failures

### GDPR

- [ ] User consent for OAuth data
- [ ] Right to revoke OAuth connections
- [ ] Data deletion on account closure

## Monitoring

- [ ] Failed OAuth attempts logged
- [ ] Rate limit violations logged
- [ ] Provider toggle audit trail

## Results Summary

| Category             | Tests  | Passed | Failed |
| -------------------- | ------ | ------ | ------ |
| Injection Prevention | 10     |        |        |
| CSRF Protection      | 3      |        |        |
| Rate Limiting        | 4      |        |        |
| Session Security     | 2      |        |        |
| Cookie Security      | 3      |        |        |
| Error Handling       | 3      |        |        |
| OAuth Flow           | 7      |        |        |
| Encryption           | 4      |        |        |
| RBAC                 | 4      |        |        |
| Callback URL         | 5      |        |        |
| CSP                  | 3      |        |        |
| Clickjacking         | 2      |        |        |
| Penetration          | 5      |        |        |
| Compliance           | 2      |        |        |
| Monitoring           | 3      |        |        |
| **TOTAL**            | **60** |        |        |

## Sign-Off

- **Auditor**: ******\_\_\_******
- **Date**: ******\_\_\_******
- **Approved**: ☐ Yes ☐ No ☐ With Conditions

---

_Summary: `oauth-security-audit-checklist.md`_
