# Enterprise Auth Flows

> Authentication flow diagrams | **Version**: 1.0

## User Login Flow

```
Client              Auth-BFF            Identity           Auth              Legal
  │                    │                    │               │                  │
  │ POST /user/login   │                    │               │                  │
  │ {email, password,  │                    │               │                  │
  │  appSlug}          │                    │               │                  │
  ├───────────────────►│                    │               │                  │
  │                    │ GetAccountByEmail  │               │                  │
  │                    ├───────────────────►│               │                  │
  │                    │◄───────────────────┤               │                  │
  │                    │ ValidatePassword   │               │                  │
  │                    ├───────────────────►│               │                  │
  │                    │◄───────────────────┤               │                  │
  │                    │ CheckSanction      │               │                  │
  │                    ├──────────────────────────────────►│                  │
  │                    │◄──────────────────────────────────┤                  │
  │                    │ CheckRequiredConsents             │                  │
  │                    ├─────────────────────────────────────────────────────►│
  │                    │◄─────────────────────────────────────────────────────┤
  │                    │ CreateSession      │               │                  │
  │                    ├───────────────────►│               │                  │
  │                    │◄───────────────────┤               │                  │
  │                    │ Store in Valkey    │               │                  │
  │◄───────────────────┤                    │               │                  │
  │ Set-Cookie:        │                    │               │                  │
  │   session_id       │                    │               │                  │
  │ Body: {user,       │                    │               │                  │
  │   permissions}     │                    │               │                  │
```

## Admin Login Flow (MFA Required)

```
Client              Auth-BFF            Auth               Audit
  │                    │                  │                   │
  │ POST /admin/login  │                  │                   │
  │ {email, password}  │                  │                   │
  ├───────────────────►│                  │                   │
  │                    │ AdminLogin       │                   │
  │                    ├─────────────────►│                   │
  │                    │◄─────────────────┤                   │
  │                    │ {mfaRequired,    │                   │
  │                    │  challengeId}    │                   │
  │◄───────────────────┤                  │                   │
  │ {mfaRequired,      │                  │                   │
  │  challengeId,      │                  │                   │
  │  methods}          │                  │                   │
  │                    │                  │                   │
  │ POST /admin/       │                  │                   │
  │  login-mfa         │                  │                   │
  │ {challengeId,code} │                  │                   │
  ├───────────────────►│                  │                   │
  │                    │ AdminLoginMfa    │                   │
  │                    ├─────────────────►│                   │
  │                    │◄─────────────────┤                   │
  │                    │ {sessionId,      │                   │
  │                    │  accessToken}    │                   │
  │                    │ LogAdminLogin    │                   │
  │                    ├──────────────────────────────────────►│
  │                    │ Store in Valkey  │                   │
  │◄───────────────────┤                  │                   │
  │ Set-Cookie:        │                  │                   │
  │   admin_session_id │                  │                   │
  │   (path=/admin)    │                  │                   │
```

## Operator Login Flow

```
Client              Auth-BFF            Identity           Auth
  │                    │                    │               │
  │ POST /operator/    │                    │               │
  │  login             │                    │               │
  │ {email, password,  │                    │               │
  │  serviceSlug}      │                    │               │
  ├───────────────────►│                    │               │
  │                    │ GetAccountByEmail  │               │
  │                    ├───────────────────►│               │
  │                    │◄───────────────────┤               │
  │                    │ ValidatePassword   │               │
  │                    ├───────────────────►│               │
  │                    │◄───────────────────┤               │
  │                    │ GetOperatorAssignment              │
  │                    ├──────────────────────────────────►│
  │                    │◄──────────────────────────────────┤
  │                    │ {assignment,      │               │
  │                    │  permissions}     │               │
  │                    │                   │               │
  │                    │ (No assignment → 403)             │
  │                    │                   │               │
  │                    │ CreateSession     │               │
  │                    │ (OPERATOR context)│               │
  │                    ├───────────────────►│               │
  │                    │◄───────────────────┤               │
  │◄───────────────────┤                    │               │
  │ Set-Cookie:        │                    │               │
  │   session_id       │                    │               │
  │ Body: {user,       │                    │               │
  │   operatorContext} │                    │               │
```

## Session Validation Flow

```
Client              Auth-BFF            Identity           Auth
  │                    │                    │               │
  │ GET /api/resource  │                    │               │
  │ Cookie: session_id │                    │               │
  ├───────────────────►│                    │               │
  │                    │ Get from Valkey   │               │
  │                    │ bff:session:{id}  │               │
  │                    │                   │               │
  │                    │ Check expiry,     │               │
  │                    │ device            │               │
  │                    │                   │               │
  │                    │ (Expired/Invalid) │               │
  │◄───────────────────┤ 401 Unauthorized  │               │
  │                    │                   │               │
  │                    │ (Tokens expired)  │               │
  │                    │ RefreshSession    │               │
  │                    ├───────────────────►│               │
  │                    │◄───────────────────┤               │
  │                    │                   │               │
  │                    │ (Valid)           │               │
  │                    │ Forward with JWT  │               │
  │                    ├──────────────────────────────────►│
  │◄───────────────────┤                    │               │
  │ Response           │                    │               │
```

## Related Documents

- Overview: `enterprise-auth-overview.md`
- Architecture: `enterprise-auth-architecture.md`
- Security: `enterprise-auth-security.md`
