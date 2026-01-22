# OAuth Security Audit Checklist

> **Date**: 2026-01-17 | **Scope**: OAuth Authentication System | **Status**: Phase 7

## Overview

This document provides a comprehensive security audit checklist for the OAuth authentication implementation in my-girok. Use this checklist for manual penetration testing and security review.

## 1. Injection Prevention

### SQL Injection

- [ ] **Test OAuth provider name injection**
  - Try: `'; DROP TABLE oauth_provider_config; --`
  - Expected: Parameterized queries prevent injection
  - Verify: Prisma ORM handles escaping

- [ ] **Test client ID injection**
  - Try: `" OR 1=1 --`
  - Expected: Validation rejects invalid characters
  - Verify: No raw SQL queries

- [ ] **Test callback URL injection**
  - Try: `https://girok.dev/callback'; DELETE FROM users; --`
  - Expected: URL validation and parameterized queries prevent injection

- [ ] **Verify Prisma query logging**
  - Check logs for parameterized queries
  - Ensure no string concatenation in SQL

### XSS (Cross-Site Scripting)

- [ ] **Test OAuth provider display name XSS**
  - Try: `<script>alert('XSS')</script>`
  - Expected: React auto-escapes, DOMPurify sanitizes
  - Verify: No `dangerouslySetInnerHTML` without sanitization

- [ ] **Test OAuth error message XSS**
  - Try: `<img src=x onerror=alert('XSS')>`
  - Expected: Error messages are sanitized
  - Verify: CSP headers block inline scripts

- [ ] **Test OAuth state parameter XSS**
  - Try: State with embedded script tags
  - Expected: Base64url encoding prevents execution
  - Verify: State is validated before use

### Command Injection

- [ ] **Test callback URL command injection**
  - Try: `https://girok.dev/$(whoami)`
  - Expected: URL validation rejects invalid syntax
  - Verify: No shell execution of user input

## 2. CSRF Protection

- [ ] **OAuth state parameter validation**
  - Verify: Each OAuth request has unique state
  - Test: Replay state from previous request
  - Expected: Rejected as invalid

- [ ] **CSRF tokens on settings updates**
  - Verify: Provider toggle requires CSRF token
  - Verify: Credentials update requires CSRF token
  - Test: POST without CSRF token
  - Expected: 403 Forbidden

- [ ] **SameSite cookie attribute**
  - Verify: Session cookies have `SameSite=Strict` or `Lax`
  - Test: Cross-site request attempt
  - Expected: Cookie not sent

## 3. Rate Limiting

- [ ] **OAuth initiation rate limiting**
  - Test: 100 OAuth requests in 1 minute
  - Expected: Rate limit after 20-50 requests
  - Verify: 429 Too Many Requests

- [ ] **Provider toggle rate limiting**
  - Test: Rapid toggle requests (100/min)
  - Expected: Rate limit enforcement
  - Verify: Per-user or per-IP limit

- [ ] **Credentials update rate limiting**
  - Test: 50 credential updates in 1 minute
  - Expected: Rate limited after 5-10 requests
  - Verify: Prevent brute force enumeration

- [ ] **OAuth callback rate limiting**
  - Test: 1000 callback requests/minute
  - Expected: Rate limit to prevent DoS
  - Verify: Valid requests still processed

## 4. Session Fixation Prevention

- [ ] **Session regeneration after OAuth login**
  - Test: Capture session ID before OAuth
  - Login via OAuth
  - Verify: New session ID issued

- [ ] **Session invalidation on logout**
  - Login, note session ID
  - Logout
  - Attempt to use old session ID
  - Expected: 401 Unauthorized

## 5. Secure Cookie Flags

- [ ] **HttpOnly flag**
  - Verify: Session cookies have `HttpOnly=true`
  - Test: `document.cookie` in browser console
  - Expected: Session cookie not accessible

- [ ] **Secure flag**
  - Verify: Cookies have `Secure=true` in production
  - Test: HTTP request includes cookie
  - Expected: Cookie only sent over HTTPS

- [ ] **SameSite attribute**
  - Verify: `SameSite=Strict` or `Lax`
  - Test: Cross-origin request includes cookie
  - Expected: Cookie not sent

## 6. Error Handling

- [ ] **No sensitive data in error messages**
  - Trigger various errors (invalid provider, etc.)
  - Verify: No database schema details exposed
  - Verify: No stack traces in production
  - Verify: No encryption keys in logs

- [ ] **Generic error messages**
  - Test: Invalid client secret
  - Expected: "Invalid credentials" (not "Secret decryption failed")
  - Test: Disabled provider
  - Expected: "Provider not available" (not "Provider disabled in DB")

- [ ] **Logging security**
  - Review application logs
  - Verify: No plaintext secrets logged
  - Verify: No PII in error logs
  - Verify: Sensitive fields are masked

## 7. OAuth-Specific Security

### Authorization Code Flow

- [ ] **Authorization code one-time use**
  - Capture authorization code from callback
  - Try to reuse same code
  - Expected: Rejected as already used

- [ ] **Code expiration**
  - Wait 10 minutes after receiving code
  - Try to exchange code for token
  - Expected: Expired code rejected

- [ ] **State parameter validation**
  - Modify state parameter in callback
  - Expected: OAuth flow rejected
  - Verify: CSRF protection

### Token Security

- [ ] **Access token not in URL**
  - Verify: Tokens in cookies, not query params
  - Check: Browser history doesn't contain tokens
  - Verify: No token logging in access logs

- [ ] **Refresh token rotation**
  - Use refresh token to get new access token
  - Verify: New refresh token issued
  - Test: Old refresh token invalidated

### Provider-Specific

- [ ] **Google OAuth scope minimal**
  - Verify: Only `email` and `profile` requested
  - Not requesting: `drive`, `calendar`, etc.

- [ ] **Apple OAuth response_mode=form_post**
  - Verify: Apple uses POST, not GET for callback
  - Prevents token leakage in URL

- [ ] **Kakao/Naver secure channel**
  - Verify: HTTPS only for callback URLs
  - Verify: Valid SSL certificates

## 8. Encryption Security

- [ ] **Client secret encryption at rest**
  - Query database directly
  - Verify: All `clientSecret` fields encrypted
  - Verify: Format: `iv:tag:encrypted`

- [ ] **AES-256-GCM usage**
  - Review code: `CryptoService`
  - Verify: `aes-256-gcm` algorithm
  - Verify: 16-byte IV, 16-byte auth tag

- [ ] **Encryption key storage**
  - Verify: Key in environment variable or secrets manager
  - Verify: Not hardcoded in source code
  - Verify: Not in version control

- [ ] **Key rotation capability**
  - Document: Process for rotating encryption key
  - Test: Decrypt old secrets with new key
  - Verify: Migration path exists

## 9. RBAC (Role-Based Access Control)

- [ ] **MASTER role required for OAuth settings**
  - Login as ADMIN user
  - Access `/system/oauth-settings`
  - Expected: 403 Forbidden

- [ ] **Non-MASTER cannot toggle providers**
  - Login as ADMIN
  - POST to `/admin/v1/oauth/providers/GOOGLE/toggle`
  - Expected: 403 Forbidden

- [ ] **Non-MASTER cannot update credentials**
  - Login as ADMIN
  - PUT to `/admin/v1/oauth/providers/GOOGLE/credentials`
  - Expected: 403 Forbidden

- [ ] **Unauthenticated access blocked**
  - Clear cookies
  - Access OAuth settings
  - Expected: Redirect to login

## 10. Callback URL Validation

- [ ] **Reject external domains**
  - Try: `https://evil.com/callback`
  - Expected: 400 Bad Request

- [ ] **Reject protocol-relative URLs**
  - Try: `//evil.com/callback`
  - Expected: 400 Bad Request

- [ ] **Accept localhost (dev only)**
  - Try: `http://localhost:4005/callback`
  - Expected: Accepted in development

- [ ] **Accept girok.dev domains**
  - Try: `https://auth-bff.girok.dev/callback`
  - Expected: Accepted

- [ ] **Reject HTTP for production**
  - Try: `http://girok.dev/callback`
  - Expected: 400 Bad Request (HTTPS required)

## 11. Content Security Policy

- [ ] **CSP headers present**
  - Inspect response headers
  - Verify: `Content-Security-Policy` header
  - Verify: `default-src 'self'`

- [ ] **No unsafe-inline**
  - Verify: CSP doesn't allow `unsafe-inline`
  - Verify: Scripts use nonce or hash

- [ ] **No unsafe-eval**
  - Verify: CSP doesn't allow `unsafe-eval`
  - Prevents dynamic code execution

## 12. Clickjacking Protection

- [ ] **X-Frame-Options header**
  - Verify: `X-Frame-Options: DENY` or `SAMEORIGIN`
  - Test: Embed OAuth page in iframe
  - Expected: Browser blocks rendering

- [ ] **frame-ancestors CSP directive**
  - Verify: `frame-ancestors 'none'` or `'self'`
  - Test: Iframe embedding from external site
  - Expected: Blocked

## 13. Penetration Testing

### Brute Force

- [ ] **OAuth callback brute force**
  - Attempt 1000 callbacks with invalid codes
  - Expected: Rate limiting or IP blocking

- [ ] **Provider enumeration**
  - Try to discover all configured providers
  - Expected: Public endpoint shows only enabled providers

### OAuth State Manipulation

- [ ] **Modified state parameter**
  - Capture legitimate state
  - Modify and replay
  - Expected: Validation fails

- [ ] **Reused state parameter**
  - Use same state twice
  - Expected: Second attempt rejected

### Open Redirect

- [ ] **returnUrl parameter validation**
  - Try: `/login?returnUrl=https://evil.com`
  - Expected: Sanitized to local path

- [ ] **OAuth redirect_uri manipulation**
  - Modify redirect_uri in OAuth URL
  - Expected: Mismatch with configured callback URL rejected

## 14. Compliance

- [ ] **OWASP Top 10 Coverage**
  - [x] A01:2021 – Broken Access Control (RBAC tests)
  - [x] A02:2021 – Cryptographic Failures (Encryption tests)
  - [x] A03:2021 – Injection (SQL/XSS tests)
  - [x] A05:2021 – Security Misconfiguration (Headers, CSP)
  - [x] A07:2021 – Identification and Authentication Failures (Session tests)

- [ ] **GDPR Compliance**
  - Verify: User consent for OAuth data collection
  - Verify: Right to revoke OAuth connections
  - Verify: Data deletion on account closure

## 15. Monitoring and Alerting

- [ ] **Failed OAuth attempts logged**
  - Trigger failed OAuth login
  - Verify: Event logged to audit service
  - Verify: Includes timestamp, user, provider

- [ ] **Rate limit violations logged**
  - Trigger rate limit
  - Verify: Alert generated
  - Verify: IP address logged

- [ ] **Provider toggle audit trail**
  - Toggle provider
  - Verify: Audit log entry created
  - Verify: Includes admin user ID, timestamp

## Results Summary

| Category             | Tests  | Passed | Failed | Notes |
| -------------------- | ------ | ------ | ------ | ----- |
| Injection Prevention | 10     |        |        |       |
| CSRF Protection      | 3      |        |        |       |
| Rate Limiting        | 4      |        |        |       |
| Session Security     | 2      |        |        |       |
| Cookie Security      | 3      |        |        |       |
| Error Handling       | 3      |        |        |       |
| OAuth Flow           | 7      |        |        |       |
| Encryption           | 4      |        |        |       |
| RBAC                 | 4      |        |        |       |
| Callback URL         | 5      |        |        |       |
| CSP                  | 3      |        |        |       |
| Clickjacking         | 2      |        |        |       |
| Penetration          | 5      |        |        |       |
| Compliance           | 2      |        |        |       |
| Monitoring           | 3      |        |        |       |
| **TOTAL**            | **60** |        |        |       |

## Sign-Off

- **Security Auditor**: \***\*\*\*\*\***\_\***\*\*\*\*\***
- **Date**: \***\*\*\*\*\***\_\***\*\*\*\*\***
- **Approved**: ☐ Yes ☐ No ☐ With Conditions

---

**Next Steps**: Address any failed tests and re-audit before production deployment.
