# Legal Service

> Consent, legal docs, DSR handling | Port: 3006 | gRPC: 50053 | legal_db

| Owns            | NOT This Service    |
| --------------- | ------------------- |
| Consents        | Accounts (identity) |
| Legal documents | Permissions (auth)  |
| Law registry    | Operators (auth)    |
| DSR requests    | Profiles (identity) |

## gRPC (Summary)

```
CheckConsents, GetAccountConsents, Grant/RevokeConsent
GetCurrentDocument, GetLawRequirements
CreateDsrRequest, GetDsrRequest
```

**SSOT**: `docs/llm/services/legal-service.md`
