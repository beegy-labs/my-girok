# Enterprise Auth Security

> Security specifications and policies | **Version**: 1.0

## Password Policy (OWASP 2024)

| Setting        | Value          | Rationale                         |
| -------------- | -------------- | --------------------------------- |
| Hash Algorithm | Argon2id       | OWASP 2024 recommended            |
| Memory         | 64MB           | Standard recommended value        |
| Iterations     | 3              | Standard recommended value        |
| Parallelism    | 4              | Standard recommended value        |
| Min Length     | 12             | NIST recommended                  |
| Max Length     | 128            | Practical upper limit             |
| Complexity     | Not required   | NIST: complexity rules not needed |
| History        | 12             | Block last 12 passwords           |
| Breach Check   | HaveIBeenPwned | Block leaked passwords            |

## Session Policy

| Setting          | User | Operator | Admin |
| ---------------- | ---- | -------- | ----- |
| Absolute Timeout | 7d   | 7d       | 8h    |
| Idle Timeout     | 30m  | 30m      | 15m   |
| Max Concurrent   | 10   | 5        | 3     |
| Device Binding   | Yes  | Yes      | Yes   |
| MFA Required     | No   | No       | Yes   |

## Token Policy

| Setting                | Value                  | Rationale               |
| ---------------------- | ---------------------- | ----------------------- |
| Access Token Lifetime  | 15 minutes             | Short exposure time     |
| Refresh Token Lifetime | User: 14d, Admin: 24h  | Role-based tiers        |
| Algorithm              | RS256                  | Asymmetric, easy verify |
| Rotation               | Refresh Token Rotation | Reuse detection         |
| Binding                | DPoP (Admin)           | Token binding           |
| Storage                | Server (BFF Valkey)    | No client exposure      |

## Rate Limiting

| Endpoint     | Per IP | Per Account | Global   |
| ------------ | ------ | ----------- | -------- |
| /user/login  | 5/min  | 10/hour     | 1000/min |
| /admin/login | 3/min  | 5/hour      | 100/min  |
| /\*/mfa      | 5/min  | -           | 500/min  |
| /\*/refresh  | 10/min | -           | 5000/min |

## Account Lockout

| Setting          | User | Admin |
| ---------------- | ---- | ----- |
| Max Failures     | 5    | 3     |
| Lockout Duration | 15m  | 30m   |
| Reset Window     | 30m  | 1h    |
| Notification     | No   | Email |

## Service Responsibilities

### identity-service (:3005)

| Domain  | Capabilities                              |
| ------- | ----------------------------------------- |
| Account | User/Operator CRUD, validation            |
| Auth    | Password validation/change/reset, lockout |
| Session | Create/validate/refresh/revoke sessions   |
| MFA     | Setup/verify/disable, backup codes        |
| Device  | Get/trust/revoke devices                  |
| Profile | Get/update profiles                       |

### auth-service (:3001)

| Domain         | Capabilities                                   |
| -------------- | ---------------------------------------------- |
| Admin Auth     | Login/MFA/logout, session management           |
| Admin MFA      | Setup/verify/disable, backup code regeneration |
| Admin Password | Change/force change                            |
| Operator       | Assign/revoke, get permissions                 |
| RBAC           | Check permissions, role management             |
| Sanction       | Check/apply/revoke sanctions                   |
| Service        | Service registry                               |

### auth-bff (:3010)

| Domain   | Capabilities                          |
| -------- | ------------------------------------- |
| Session  | Valkey storage, token exchange        |
| Security | Cookie management, CSRF protection    |
| Gateway  | Rate limiting, gRPC → REST conversion |

### audit-service (:3004)

| Domain     | Capabilities                        |
| ---------- | ----------------------------------- |
| Logging    | Auth/security events, admin actions |
| Compliance | Compliance report generation        |

## Success Criteria

| Metric              | Target        | Measurement            |
| ------------------- | ------------- | ---------------------- |
| Login latency       | < 500ms (p99) | Prometheus metrics     |
| Session validation  | < 50ms (p99)  | Prometheus metrics     |
| Availability        | 99.9%         | Uptime monitoring      |
| Test coverage       | > 80%         | Vitest coverage report |
| Security compliance | OWASP ASVS L2 | Security audit         |

## Related Documents

- Overview: `enterprise-auth-overview.md`
- Architecture: `enterprise-auth-architecture.md`
- Auth Flows: `enterprise-auth-flows.md`
- Security Policy: `docs/llm/policies/security.md`
