# Account Linking

```yaml
flow: SERVICE + SERVICE -> UNIFIED
prereq: [same_email, both_SERVICE_mode, no_existing_link]
```

## API

| Step    | Method | Endpoint                                | Body                                     |
| ------- | ------ | --------------------------------------- | ---------------------------------------- |
| Find    | GET    | `/v1/users/me/linkable-accounts`        | -                                        |
| Request | POST   | `/v1/users/me/link-account`             | `{linkedUserId}`                         |
| Accept  | POST   | `/v1/users/me/accept-link`              | `{linkId, password, platformConsents[]}` |
| View    | GET    | `/v1/users/me/linked-accounts`          | -                                        |
| Unlink  | DELETE | `/v1/users/me/linked-accounts/{linkId}` | -                                        |

## Accept Request Body

```json
{
  "linkId": "uuid",
  "password": "string",
  "platformConsents": [{ "type": "CROSS_SERVICE_SHARING", "countryCode": "KR", "agreed": true }]
}
```

## Unified Token

```json
{
  "sub": "account-a-uuid",
  "type": "USER_ACCESS",
  "accountMode": "UNIFIED",
  "services": {
    "resume": { "status": "ACTIVE", "countries": ["KR"] },
    "feed": { "status": "ACTIVE", "countries": ["KR"] }
  }
}
```

## Required Consents

| Type                  | Required    |
| --------------------- | ----------- |
| CROSS_SERVICE_SHARING | Yes         |
| PRIVACY_POLICY        | Recommended |

## Errors

| Code | Error                | Cause                        |
| ---- | -------------------- | ---------------------------- |
| 409  | Link already exists  | Already linked               |
| 400  | Both already UNIFIED | Cannot link UNIFIED accounts |
| 401  | Invalid password     | Auth failed                  |

## Unlink Behavior

- Status -> UNLINKED
- No other links -> reverts to SERVICE mode
- Personal info/consents preserved

## Security

- Password verification required
- Same-email only
- All operations audited
