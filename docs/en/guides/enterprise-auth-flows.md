# Enterprise Auth Flows

> Authentication flow diagrams

**Version**: 1.0

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

### Flow Steps

1. Client sends login request with email, password, and app slug
2. Auth-BFF calls Identity Service to get account by email
3. Auth-BFF validates password against stored hash
4. Auth-BFF checks for active sanctions via Auth Service
5. Auth-BFF checks for required consents via Legal Service
6. Auth-BFF creates session in Identity Service
7. BFF stores session data in Valkey
8. Client receives session cookie and user info

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

### Admin Flow Steps

1. Admin submits credentials
2. Auth Service validates and returns MFA challenge
3. Admin enters MFA code
4. Auth Service verifies MFA and issues session
5. Login event logged to Audit Service
6. Admin receives admin-scoped session cookie

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

### Operator Flow Steps

1. User logs in as operator with service context
2. Identity Service validates credentials
3. Auth Service checks operator assignment
4. If assigned, session created with OPERATOR context
5. If not assigned, returns 403 Forbidden

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

- Overview: `docs/en/guides/enterprise-auth-overview.md`
- Architecture: `docs/en/guides/enterprise-auth-architecture.md`
- Security: `docs/en/guides/enterprise-auth-security.md`

---

_This document is auto-generated from `docs/llm/guides/enterprise-auth-flows.md`_
