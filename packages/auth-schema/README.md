# Auth Schema

Language-independent authentication schema for JWT payload and configuration.

## Files

- `jwt-payload.json` - JWT Claims structure (JSON Schema)
- `jwt-config.json` - Token configuration (expiration, algorithm)

## Usage

### Node.js (TypeScript)
```typescript
import type { JWTPayload } from '@my-girok/types';
```

### Go
```go
import "github.com/beegy-labs/my-girok/packages/go-common/auth"
```

## JWT Payload Structure

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| sub | string | Yes | User ID |
| email | string | Yes | User email |
| username | string | No | Username |
| role | enum | Yes | GUEST, USER, MANAGER, MASTER |
| type | enum | Yes | access, refresh |
| provider | enum | No | LOCAL, GOOGLE, KAKAO, NAVER, APPLE |
| iat | integer | Auto | Issued at timestamp |
| exp | integer | Auto | Expiration timestamp |
